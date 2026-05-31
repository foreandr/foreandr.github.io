const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeCountryName,
  pickLatestSeriesValue,
  buildGeoIndex,
  buildCountryProfile,
  createSeriesRow,
  resolveCountrySurfaceState
} = require('../shared/homepage-country-intel.js');

test('normalizeCountryName resolves common aliases', () => {
  assert.equal(normalizeCountryName('USA'), 'united states of america');
  assert.equal(normalizeCountryName('South Korea'), 'korea, rep.');
  assert.equal(normalizeCountryName('  Russia  '), 'russian federation');
});

test('pickLatestSeriesValue returns the newest numeric datapoint', () => {
  assert.deepEqual(
    pickLatestSeriesValue({ 2019: null, 2020: '12.5', 2018: 9 }),
    { year: 2020, value: 12.5 }
  );
  assert.equal(pickLatestSeriesValue({ foo: 'bar' }), null);
});

test('createSeriesRow keeps selectable year history', () => {
  const row = createSeriesRow({
    id: 'NGDPD',
    label: 'GDP',
    unit: 'B USD',
    source: 'IMF',
    category: 'Macro',
    series: { 2024: 2140, 2023: 2075.5, 2022: 1980 }
  });

  assert.equal(row.year, 2024);
  assert.deepEqual(row.years.slice(0, 3), [2024, 2023, 2022]);
  assert.equal(row.valuesByYear[2023], 2075.5);
  assert.equal(row.history[1].year, 2023);
});

test('createSeriesRow drops years after the current year cutoff', () => {
  const row = createSeriesRow({
    id: 'BCA',
    label: 'Current account balance',
    unit: 'B USD',
    source: 'IMF',
    category: 'Trade',
    currentYear: 2026,
    series: { 2030: 40.9, 2028: 38.2, 2026: 31.5, 2025: 29.8 }
  });

  assert.deepEqual(row.years, [2026, 2025]);
  assert.equal(row.year, 2026);
  assert.equal(row.valuesByYear[2030], undefined);
});

test('buildCountryProfile combines geo, economy, and resources', () => {
  const geoIndex = buildGeoIndex({
    features: [
      {
        properties: {
          NAME: 'Canada',
          ISO_A3: 'CAN',
          CONTINENT: 'North America',
          REGION_WB: 'North America',
          INCOME_GRP: '1. High income'
        }
      }
    ]
  });

  const resourceData = {
    meta: {
      resources: [
        { id: 'oil_prod', label: 'Oil Production', category: 'Energy', unitShort: 'Mt/yr' },
        { id: 'gold_prod', label: 'Gold Production', category: 'Metals', unitShort: 't/yr' }
      ]
    },
    countries: {
      CAN: {
        oil_prod: { 2023: 120, 2022: 110 },
        gold_prod: { 2023: 40 }
      }
    }
  };

  const datasets = [
    {
      id: 'imf_data',
      values: {
        Canada: {
          NGDPD: { 2024: 2140, 2023: 2075.5 },
          NGDPDPC: { 2024: 54000 },
          LP: { 2024: 41.1 },
          PCPIPCH: { 2024: 2.8 },
          BXGDP: { 2024: 33.2 },
          GGXWDGNGDP: { 2024: 88.1 }
        }
      }
    },
    {
      id: 'world_bank_data',
      values: {
        Canada: {
          ID11ACCESSELECTRICITYTOT: { 2016: 100 },
          ID21SHARETOTALREINTFEC: { 2015: 24.2 },
          ID411TOTALELECTRICITYOUTPUT: { 2015: 600000 }
        }
      }
    }
  ];

  const profile = buildCountryProfile({
    countryName: 'Canada',
    geoIndex,
    resourceData,
    datasets
  });

  assert.equal(profile.name, 'Canada');
  assert.equal(profile.iso3, 'CAN');
  assert.equal(profile.meta.continent, 'North America');
  assert.equal(profile.sections.some(section => section.id === 'economy'), true);
  assert.equal(profile.sections.some(section => section.id === 'financial'), true);
  assert.equal(profile.sections.some(section => section.id === 'trade'), true);
  assert.equal(profile.sections.some(section => section.id === 'resources-energy'), true);
  const economy = profile.sections.find(section => section.id === 'economy');
  assert.equal(economy.rows[0].label.length > 0, true);
  assert.deepEqual(economy.rows[0].years[0] >= economy.rows[0].years[1], true);
  const resources = profile.sections.find(section => section.id === 'resources-energy');
  assert.equal(resources.rows[0].label, 'Oil Production');
  assert.equal(resources.rows[0].value, 120);
});

test('resolveCountrySurfaceState prefers click selection over visitor default', () => {
  const visitorOnly = resolveCountrySurfaceState({
    homeCountry: { name: 'Canada', iso3: 'CAN' }
  });
  assert.equal(visitorOnly.highlightedCountry.name, 'Canada');
  assert.equal(visitorOnly.panelCountry.name, 'Canada');
  assert.equal(visitorOnly.panelLabel, 'Visitor country');

  const hoverWithoutSelection = resolveCountrySurfaceState({
    homeCountry: { name: 'Canada', iso3: 'CAN' },
    hoveredCountry: { name: 'Mexico', iso3: 'MEX' }
  });
  assert.equal(hoverWithoutSelection.highlightedCountry.name, 'Canada');
  assert.equal(hoverWithoutSelection.panelCountry.name, 'Mexico');
  assert.equal(hoverWithoutSelection.panelLabel, 'Hover country');

  const clickedCountry = resolveCountrySurfaceState({
    homeCountry: { name: 'Canada', iso3: 'CAN' },
    hoveredCountry: { name: 'Mexico', iso3: 'MEX' },
    selectedCountry: { name: 'Brazil', iso3: 'BRA' }
  });
  assert.equal(clickedCountry.highlightedCountry.name, 'Brazil');
  assert.equal(clickedCountry.panelCountry.name, 'Brazil');
  assert.equal(clickedCountry.panelLabel, 'Selected country');
});
