const countries = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'JP', name: 'Japon', flag: '🇯🇵' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'NL', name: 'Paises Bajos', flag: '🇳🇱' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
];

let selectedCountry = null;

function renderCountryGrid() {
  const grid = document.getElementById('country-grid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.className = 'country-list';
  countries.forEach(country => {
    const btn = document.createElement('button');
    btn.className = 'country-list-item';
    btn.dataset.code = country.code;
    btn.innerHTML = `<span class="country-flag">${country.flag}</span><span class="country-name">${country.name}</span>`;
    btn.onclick = () => selectCountry(country.code);
    grid.appendChild(btn);
  });
}

function selectCountry(code) {
  selectedCountry = countries.find(c => c.code === code);
  document.querySelectorAll('.country-list-item').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.code === code);
  });
}

function getSelectedCountry() {
  return selectedCountry;
}
