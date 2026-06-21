let matchmakingRef = null;
let currentGameId = null;
let playerColor = null;
let opponentData = null;
let opponentUid = null;
let selectedTimeControl = 600; // 10 minutes default (in seconds)

function updateSelectedTimeControl(value) {
  selectedTimeControl = parseInt(value, 10);
  console.log('Selected time control changed to:', selectedTimeControl, 'seconds');
}

function startMatchmaking() {
  const db = getDatabase();
  const user = getCurrentUser();
  const profile = getUserProfile();
  
  if (!db || !user || !profile) {
    addChatMessage('Sistema', 'Error: No hay conexion con el servidor');
    return;
  }
  
  showWaitingModal();
  
  const queueRef = db.ref('matchmaking_queue');
  
  queueRef.child(user.uid).remove().then(() => {
    return queueRef.once('value');
  }).then((snapshot) => {
    const queue = snapshot.val() || {};
    // Only match players with the exact same selected time control and not already matched
    const waitingPlayers = Object.keys(queue).filter(uid => {
      return uid !== user.uid && queue[uid].timeControl === selectedTimeControl && !queue[uid].matchedGameId;
    });
    
    console.log('Queue check for time', selectedTimeControl, ':', waitingPlayers.length, 'players waiting');
    
    if (waitingPlayers.length > 0) {
      const foundOpponentUid = waitingPlayers[0];
      const opponent = queue[foundOpponentUid];
      
      console.log('Found opponent:', foundOpponentUid);
      
      // Match handshake: Generate a unique game ID first
      const gameRef = db.ref('games').push();
      const gameId = gameRef.key;
      
      // Write gameId into the waiting player's queue record to notify them
      db.ref('matchmaking_queue/' + foundOpponentUid).update({
        matchedGameId: gameId
      }).then(() => {
        // Create the game in the database
        createGame(gameId, user.uid, foundOpponentUid, profile, opponent, selectedTimeControl);
      });
    } else {
      console.log('No opponents, adding to queue');
      
      const myQueueRef = queueRef.child(user.uid);
      myQueueRef.set({
        username: profile.username,
        country: profile.country,
        countryFlag: profile.countryFlag,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        draws: profile.draws || 0,
        timeControl: selectedTimeControl,
        elo: profile.elo || 1200,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      matchmakingRef = queueRef;
      
      // Direct, real-time matching handshake
      myQueueRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.matchedGameId) {
          console.log('I have been matched! Game ID:', data.matchedGameId);
          myQueueRef.off();
          
          // Delete our queue entry since we matched
          myQueueRef.remove();
          
          // Fetch the game data and join it
          db.ref('games/' + data.matchedGameId).once('value').then((gameSnap) => {
            joinExistingGame(data.matchedGameId, gameSnap.val());
          });
        }
      });
    }
  });
}

function createGame(gameId, player1Uid, player2Uid, player1Profile, player2Data, timeControl) {
  const db = getDatabase();
  if (!db) return;
  
  currentGameId = gameId;
  const gameRef = db.ref('games/' + gameId);
  
  const whitePlayer = Math.random() < 0.5 ? player1Uid : player2Uid;
  const blackPlayer = whitePlayer === player1Uid ? player2Uid : player1Uid;
  
  playerColor = whitePlayer === player1Uid ? 'white' : 'black';
  
  opponentData = player2Data;
  opponentUid = player2Uid;
  
  console.log('Creating game with pre-generated ID:', currentGameId, 'I am', playerColor);
  
  const gameData = {
    status: 'waiting_for_player',
    whitePlayer: whitePlayer,
    blackPlayer: blackPlayer,
    players: {
      [player1Uid]: true,
      [player2Uid]: true
    },
    playerData: {
      [player1Uid]: {
        username: player1Profile.username,
        country: player1Profile.country,
        countryFlag: player1Profile.countryFlag,
        wins: player1Profile.wins || 0,
        elo: player1Profile.elo || 1200
      },
      [player2Uid]: {
        username: player2Data.username,
        country: player2Data.country,
        countryFlag: player2Data.countryFlag,
        wins: player2Data.wins || 0,
        elo: player2Data.elo || 1200
      }
    },
    timeControl: timeControl,
    whiteTime: timeControl,
    blackTime: timeControl,
    lastTurnTimestamp: firebase.database.ServerValue.TIMESTAMP,
    currentTurn: 'white',
    board: null,
    moves: [],
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  
  gameRef.set(gameData).then(() => {
    console.log('Game created, waiting for opponent to join');
    
    gameRef.child('status').on('value', (snapshot) => {
      const status = snapshot.val();
      console.log('Game status changed:', status);
      
      if (status === 'active') {
        gameRef.child('status').off();
        hideWaitingModal();
        showOpponentFoundModal(player2Data, playerColor === 'white' ? 'black' : 'white');
        
        setTimeout(() => {
          hideOpponentFoundModal();
          startOnlineGame();
        }, 3000);
      }
    });
  });
}

function joinExistingGame(gameId, gameData) {
  const user = getCurrentUser();
  if (!user) return;
  
  currentGameId = gameId;
  
  const db = getDatabase();
  if (!db) return;
  
  playerColor = gameData.whitePlayer === user.uid ? 'white' : 'black';
  
  opponentUid = playerColor === 'white' ? gameData.blackPlayer : gameData.whitePlayer;
  opponentData = gameData.playerData[opponentUid];
  
  // Set both status to active and the starting timestamp using server time
  db.ref('games/' + gameId).update({
    status: 'active',
    lastTurnTimestamp: firebase.database.ServerValue.TIMESTAMP
  });
  
  hideWaitingModal();
  showOpponentFoundModal(opponentData, playerColor === 'white' ? 'black' : 'white');
  
  setTimeout(() => {
    hideOpponentFoundModal();
    startOnlineGame();
  }, 3000);
}

function cancelMatchmaking() {
  const db = getDatabase();
  const user = getCurrentUser();
  
  if (db && user) {
    db.ref('matchmaking_queue/' + user.uid).remove();
  }
  
  if (matchmakingRef) {
    matchmakingRef.off();
    matchmakingRef = null;
  }
  
  hideWaitingModal();
  showLobbyModal();
}

function startOnlineGame() {
  hideAllModals();
  
  if (typeof admobService !== 'undefined') {
    admobService.hideBanner();
  }
  
  doResetGame(false);
  clearGameMoves();
  
  gameMode = 'online';
  
  setBoardFlip(playerColor === 'black');
  
  document.getElementById('game-header').style.display = 'flex';
  document.getElementById('game-footer').style.display = 'flex';
  
  updateControlButtons(true);
  
  if (opponentData) {
    document.getElementById('opponent-flag').textContent = opponentData.countryFlag || '';
    document.getElementById('opponent-name').textContent = `${opponentData.username || 'Oponente'} (${opponentData.elo || 1200})`;
    document.getElementById('opponent-stats').textContent = (opponentData.wins || 0) + 'V / ' + (opponentData.losses || 0) + 'D / ' + (opponentData.draws || 0) + 'E';
  }
  
  const profile = getUserProfile();
  if (profile) {
    document.getElementById('my-flag').textContent = profile.countryFlag || '';
    document.getElementById('my-name').textContent = `${profile.username || 'Tu'} (${profile.elo || 1200})`;
    document.getElementById('my-stats').textContent = (profile.wins || 0) + 'V / ' + (profile.losses || 0) + 'D / ' + (profile.draws || 0) + 'E';
  }
  
  initGameSync();
  initOnlineChat();
  
  addChatMessage('Sistema', 'Partida online iniciada. Juegas con ' + (playerColor === 'white' ? 'Blancas' : 'Negras'));
}

function resignGame() {
  if (gameMode !== 'online') return;
  
  setOutcomeRecorded(true);
  updateUserLosses();
  
  saveGameToHistory('loss', opponentData || { username: 'Oponente', countryFlag: '' }, getGameMoves(), playerColor);
  
  addChatMessage('Sistema', 'Te has rendido. Has perdido la partida.');
  
  const db = getDatabase();
  if (db && currentGameId) {
    db.ref('games/' + currentGameId).update({
      status: 'resigned',
      winner: playerColor === 'white' ? 'black' : 'white'
    });
  }
  
  endOnlineGame(true);
}

function claimVictory() {
  setOutcomeRecorded(true);
  updateUserWins();
  
  saveGameToHistory('win', opponentData || { username: 'Oponente', countryFlag: '' }, getGameMoves(), playerColor);
  
  addChatMessage('Sistema', 'Victoria reclamada por abandono del oponente.');
  endOnlineGame(true);
}

function returnToLobby() {
  endOnlineGame(true);
}

function endOnlineGame(navigateToLobby = false) {
  if (matchmakingRef) {
    matchmakingRef.off();
    matchmakingRef = null;
  }
  
  cleanupGameSync();
  
  setBoardFlip(false);
  
  currentGameId = null;
  playerColor = null;
  opponentData = null;
  opponentUid = null;
  gameMode = null;
  
  document.getElementById('game-header').style.display = 'none';
  document.getElementById('game-footer').style.display = 'none';
  
  updateControlButtons(false);
  
  hideDisconnectModal();
  
  if (navigateToLobby) {
    cleanupChat();
    doResetGame(false);
    if (typeof admobService !== 'undefined') {
      admobService.showInterstitial(() => {
        showLobbyModal();
      });
    } else {
      showLobbyModal();
    }
  }
}

function getPlayerColor() {
  return playerColor;
}

function getCurrentGameId() {
  return currentGameId;
}

function getOpponentUid() {
  return opponentUid;
}

function getOpponentData() {
  return opponentData;
}

let privateGameRef = null;
let privateGameCode = null;

function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createPrivateGame() {
  const db = getDatabase();
  const user = getCurrentUser();
  const profile = getUserProfile();
  
  if (!db || !user || !profile) {
    addChatMessage('Sistema', 'Error: No hay conexion con el servidor');
    return;
  }
  
  privateGameCode = generateGameCode();
  
  const gameRef = db.ref('games').push();
  currentGameId = gameRef.key;
  
  gameRef.set({
    privateCode: privateGameCode,
    hostUid: user.uid,
    status: 'waiting_private',
    timeControl: selectedTimeControl,
    whiteTime: selectedTimeControl,
    blackTime: selectedTimeControl,
    lastTurnTimestamp: firebase.database.ServerValue.TIMESTAMP,
    whitePlayer: null,
    blackPlayer: null,
    players: {
      [user.uid]: true
    },
    playerData: {
      [user.uid]: {
        username: profile.username,
        country: profile.country,
        countryFlag: profile.countryFlag,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        draws: profile.draws || 0
      }
    },
    currentTurn: 'white',
    board: null,
    moves: [],
    createdAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    hideLobbyModal();
    showGameCodeModal(privateGameCode);
    
    privateGameRef = gameRef;
    privateGameRef.child('guestUid').on('value', (snapshot) => {
      const guestUid = snapshot.val();
      if (guestUid && guestUid !== user.uid) {
        privateGameRef.child('playerData/' + guestUid).once('value', (guestSnap) => {
          const guestData = guestSnap.val();
          if (guestData) {
            startPrivateGameAsHost(guestUid, guestData);
          }
        });
      }
    });
  }).catch((err) => {
    console.error('Error creating private game:', err);
    addChatMessage('Sistema', 'Error al crear la partida');
  });
}

function startPrivateGameAsHost(guestUid, guestData) {
  const db = getDatabase();
  const user = getCurrentUser();
  const profile = getUserProfile();
  
  if (!db || !user || !profile) return;
  
  if (guestUid === user.uid) {
    console.log('Cannot match with self');
    return;
  }
  
  if (privateGameRef) {
    privateGameRef.off();
  }
  
  const hostIsWhite = Math.random() < 0.5;
  playerColor = hostIsWhite ? 'white' : 'black';
  
  opponentData = guestData;
  opponentUid = guestUid;
  
  privateGameRef.update({
    status: 'active',
    whitePlayer: hostIsWhite ? user.uid : guestUid,
    blackPlayer: hostIsWhite ? guestUid : user.uid,
    lastTurnTimestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    cleanupPrivateGameRefs();
    
    hideGameCodeModal();
    showOpponentFoundModal(guestData, playerColor === 'white' ? 'black' : 'white');
    
    setTimeout(() => {
      hideOpponentFoundModal();
      startOnlineGame();
    }, 3000);
  });
}

function showJoinGameModal() {
  hideLobbyModal();
  const modal = document.getElementById('join-game-modal');
  if (modal) {
    modal.classList.add('active');
    if (typeof admobService !== 'undefined') {
      admobService.showBanner('join-code');
    }
    const input = document.getElementById('join-code-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const error = document.getElementById('join-error');
    if (error) error.style.display = 'none';
  }
}

function hideJoinGameModal() {
  const modal = document.getElementById('join-game-modal');
  if (modal) modal.classList.remove('active');
  showLobbyModal();
}

function joinPrivateGame() {
  console.log('joinPrivateGame called');
  
  const input = document.getElementById('join-code-input');
  const error = document.getElementById('join-error');
  
  if (!input) {
    console.log('Input element not found');
    return;
  }
  
  const code = input.value.toUpperCase().trim();
  
  if (code.length !== 6) {
    if (error) {
      error.textContent = 'El codigo debe tener 6 caracteres';
      error.style.display = 'block';
    }
    return;
  }
  
  const db = getDatabase();
  const user = getCurrentUser();
  const profile = getUserProfile();
  
  if (!db || !user || !profile) {
    if (error) {
      error.textContent = 'Error de conexion';
      error.style.display = 'block';
    }
    return;
  }
  
  console.log('Searching for game with code:', code);
  
  db.ref('games').once('value').then((snapshot) => {
    let gameKey = null;
    let gameData = null;
    
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.privateCode === code) {
        gameKey = child.key;
        gameData = data;
        console.log('Found game:', gameKey, 'status:', gameData?.status);
      }
    });
    
    if (!gameKey) {
      console.log('No game found with code:', code);
      if (error) {
        error.textContent = 'Codigo de partida no encontrado';
        error.style.display = 'block';
      }
      return;
    }
    
    console.log('Game data status:', gameData?.status);
    
    if (!gameData || gameData.status !== 'waiting_private') {
      console.log('Game not available, status:', gameData?.status);
      if (error) {
        error.textContent = 'Esta partida ya no esta disponible';
        error.style.display = 'block';
      }
      return;
    }
    
    if (gameData.hostUid === user.uid) {
      console.log('Cannot join own game');
      if (error) {
        error.textContent = 'No puedes unirte a tu propia partida';
        error.style.display = 'block';
      }
      return;
    }
    
    const hostUid = gameData.hostUid;
    opponentData = gameData.playerData[hostUid];
    opponentUid = hostUid;
    currentGameId = gameKey;
    
    console.log('Joining game as guest, host:', hostUid);
    
    const joinModal = document.getElementById('join-game-modal');
    if (joinModal) joinModal.classList.remove('active');
    
    showWaitingModal();
    
    const gameRef = db.ref('games/' + gameKey);
    
    console.log('Updating game to join as guest');
    
    const updates = {};
    updates['guestUid'] = user.uid;
    updates['players/' + user.uid] = true;
    updates['playerData/' + user.uid] = {
      username: profile.username,
      country: profile.country,
      countryFlag: profile.countryFlag,
      wins: profile.wins || 0,
      losses: profile.losses || 0,
      draws: profile.draws || 0
    };
    updates['status'] = 'matched_private';
    
    gameRef.update(updates).then(() => {
      console.log('Successfully joined game, waiting for host to start');
      privateGameRef = gameRef;
      
      gameRef.child('status').on('value', (statusSnap) => {
        const status = statusSnap.val();
        console.log('Game status changed to:', status);
        if (status === 'cancelled') {
          gameRef.off();
          cleanupPrivateGameRefs();
          hideWaitingModal();
          showLobbyModal();
          addChatMessage('Sistema', 'La partida fue cancelada');
        } else if (status === 'active') {
          gameRef.off();
          
          gameRef.once('value').then((gamSnap) => {
            const game = gamSnap.val();
            if (game) {
              playerColor = game.whitePlayer === user.uid ? 'white' : 'black';
              
              cleanupPrivateGameRefs();
              hideWaitingModal();
              showOpponentFoundModal(opponentData, playerColor === 'white' ? 'black' : 'white');
              
              setTimeout(() => {
                hideOpponentFoundModal();
                startOnlineGame();
              }, 3000);
            }
          });
        }
      });
    }).catch((err) => {
      console.error('Failed to join game:', err);
      hideWaitingModal();
      if (error) {
        error.textContent = 'Error al unirse a la partida';
        error.style.display = 'block';
      }
      showJoinGameModal();
    });
  });
}

function showGameCodeModal(code) {
  const modal = document.getElementById('game-code-modal');
  const codeText = document.getElementById('game-code-text');
  if (modal && codeText) {
    codeText.textContent = code;
    modal.classList.add('active');
    if (typeof admobService !== 'undefined') {
      admobService.showBanner('game-code');
    }
  }
}

function hideGameCodeModal() {
  const modal = document.getElementById('game-code-modal');
  if (modal) modal.classList.remove('active');
}

function copyGameCode() {
  const codeText = document.getElementById('game-code-text');
  if (codeText) {
    navigator.clipboard.writeText(codeText.textContent).then(() => {
      const btn = document.querySelector('.copy-btn');
      if (btn) {
        btn.textContent = 'Copiado!';
        setTimeout(() => {
          btn.textContent = 'Copiar';
        }, 2000);
      }
    });
  }
}

function cancelPrivateGame() {
  if (privateGameRef) {
    const ref = privateGameRef;
    privateGameRef = null;
    ref.off();
    ref.update({ status: 'cancelled' }).then(() => {
      ref.remove();
    });
  }
  
  privateGameCode = null;
  currentGameId = null;
  
  hideGameCodeModal();
  showLobbyModal();
}

function cleanupPrivateGameRefs() {
  if (privateGameRef) {
    privateGameRef.off();
    privateGameRef = null;
  }
  privateGameCode = null;
}
