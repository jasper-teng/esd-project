<template>
  <div class="page">
    <div class="page-header teal">
      <div class="page-icon">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </div>
      <div>
        <h1>Tap Out</h1>
        <p>End your journey — fare is calculated and deducted from your card</p>
      </div>
    </div>

    <div class="form-card">
      <div class="form-group">
        <label>Card ID</label>
        <input v-model="form.cardId" type="text" placeholder="e.g. EZ-1234567890" @input="result = null" />
      </div>

      <div class="form-group">
        <label>Exit Station</label>
        <div class="station-dropdown" ref="dropdownRef">
          <div class="station-input" :class="{ open: dropdownOpen }" @click="dropdownOpen = !dropdownOpen">
            <span v-if="form.station" class="station-selected">
              <span class="dot" :style="{ background: getLineColor(form.station.split(' ')[0]) }"></span>
              <span class="code">{{ form.station.split(' ')[0] }}</span>
              <span class="sname">{{ form.station.split(' ').slice(1).join(' ') }}</span>
            </span>
            <span v-else class="placeholder">Select station</span>
            <svg viewBox="0 0 24 24" class="chevron" :class="{ rotated: dropdownOpen }"><polyline points="6,9 12,15 18,9"/></svg>
          </div>
          <div v-if="dropdownOpen" class="station-list">
            <div v-for="g in stationGroups" :key="g.line">
              <div class="line-header">{{ g.line }}</div>
              <div
                v-for="s in g.stations" :key="s.code"
                class="station-option"
                :class="{ selected: form.station === `${s.code} ${s.name}` }"
                @click="selectStation(s)"
              >
                <span class="dot" :style="{ background: getLineColor(s.code) }"></span>
                <span class="code">{{ s.code }}</span>
                <span class="sname">{{ s.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn--teal" :disabled="!form.cardId.trim() || !form.station || loading" @click="handleTapOut">
        {{ loading ? 'Calculating fare...' : 'Tap out' }}
      </button>
    </div>

    <transition name="slide-up">
      <div v-if="result" class="result-panel" :class="result.type">
        <div class="result-icon">
          <svg v-if="result.type === 'success'" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
        </div>
        <div class="result-body">
          <div class="result-title">{{ result.title }}</div>
          <div class="result-msg">{{ result.message }}</div>
          <div v-if="result.fare" class="fare-breakdown">
            <div class="fare-row">
              <span>Distance</span><span>{{ result.fare.distanceKm }} km</span>
            </div>
            <div class="fare-row">
              <span>Base fare</span><span>${{ result.fare.baseFare }}</span>
            </div>
            <div v-if="result.fare.peakDiscount" class="fare-row fare-row--discount">
              <span>Peak discount</span><span>-${{ result.fare.peakDiscount }}</span>
            </div>
            <div v-if="result.fare.concessionDiscount" class="fare-row fare-row--discount">
              <span>Concession ({{ result.fare.concessionPct }}% off)</span>
              <span>-${{ result.fare.concessionDiscount }}</span>
            </div>
            <div v-if="result.fare.isTransfer" class="fare-row fare-row--note">
              <span>Journey continuity applied</span><span>No boarding charge</span>
            </div>
            <div class="fare-row fare-row--total">
              <span>Total charged</span><span>${{ result.fare.total }}</span>
            </div>
            <div class="fare-row fare-row--balance">
              <span>Remaining balance</span><span>${{ result.fare.newBalance }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const dropdownOpen = ref(false)
const dropdownRef  = ref(null)

const lineColors = {
  NS: '#d42e12', EW: '#009645', CG: '#009645',
  NE: '#9900aa', CC: '#fa9e0d', CE: '#fa9e0d',
  DT: '#005ec4', TE: '#9d5b25',
  BP: '#748477', SW: '#748477', SE: '#748477',
  PW: '#748477', PE: '#748477', STC: '#748477', PTC: '#748477',
}

function getLineColor(code) {
  const prefix = code.replace(/\d/g, '')
  return lineColors[prefix] || '#888'
}

function selectStation(s) {
  form.value.station = `${s.code} ${s.name}`
  dropdownOpen.value = false
  result.value = null
}

function handleClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const stationGroups = [
  { line: 'North-South Line', stations: [
    { code: 'NS1',  name: 'Jurong East' },
    { code: 'NS2',  name: 'Bukit Batok' },
    { code: 'NS3',  name: 'Bukit Gombak' },
    { code: 'NS4',  name: 'Choa Chu Kang' },
    { code: 'NS5',  name: 'Yew Tee' },
    { code: 'NS7',  name: 'Kranji' },
    { code: 'NS8',  name: 'Marsiling' },
    { code: 'NS9',  name: 'Woodlands' },
    { code: 'NS10', name: 'Admiralty' },
    { code: 'NS11', name: 'Sembawang' },
    { code: 'NS12', name: 'Canberra' },
    { code: 'NS13', name: 'Yishun' },
    { code: 'NS14', name: 'Khatib' },
    { code: 'NS15', name: 'Yio Chu Kang' },
    { code: 'NS16', name: 'Ang Mo Kio' },
    { code: 'NS17', name: 'Bishan' },
    { code: 'NS18', name: 'Braddell' },
    { code: 'NS19', name: 'Toa Payoh' },
    { code: 'NS20', name: 'Novena' },
    { code: 'NS21', name: 'Newton' },
    { code: 'NS22', name: 'Orchard' },
    { code: 'NS23', name: 'Somerset' },
    { code: 'NS24', name: 'Dhoby Ghaut' },
    { code: 'NS25', name: 'City Hall' },
    { code: 'NS26', name: 'Raffles Place' },
    { code: 'NS27', name: 'Marina Bay' },
    { code: 'NS28', name: 'Marina South Pier' },
  ]},
  { line: 'East-West Line', stations: [
    { code: 'EW1',  name: 'Pasir Ris' },
    { code: 'EW2',  name: 'Tampines' },
    { code: 'EW3',  name: 'Simei' },
    { code: 'EW4',  name: 'Tanah Merah' },
    { code: 'EW5',  name: 'Bedok' },
    { code: 'EW6',  name: 'Kembangan' },
    { code: 'EW7',  name: 'Eunos' },
    { code: 'EW8',  name: 'Paya Lebar' },
    { code: 'EW9',  name: 'Aljunied' },
    { code: 'EW10', name: 'Kallang' },
    { code: 'EW11', name: 'Lavender' },
    { code: 'EW12', name: 'Bugis' },
    { code: 'EW13', name: 'City Hall' },
    { code: 'EW14', name: 'Raffles Place' },
    { code: 'EW15', name: 'Tanjong Pagar' },
    { code: 'EW16', name: 'Outram Park' },
    { code: 'EW17', name: 'Tiong Bahru' },
    { code: 'EW18', name: 'Redhill' },
    { code: 'EW19', name: 'Queenstown' },
    { code: 'EW20', name: 'Commonwealth' },
    { code: 'EW21', name: 'Buona Vista' },
    { code: 'EW22', name: 'Dover' },
    { code: 'EW23', name: 'Clementi' },
    { code: 'EW24', name: 'Jurong East' },
    { code: 'EW25', name: 'Chinese Garden' },
    { code: 'EW26', name: 'Lakeside' },
    { code: 'EW27', name: 'Boon Lay' },
    { code: 'EW28', name: 'Pioneer' },
    { code: 'EW29', name: 'Joo Koon' },
    { code: 'EW30', name: 'Gul Circle' },
    { code: 'EW31', name: 'Tuas Crescent' },
    { code: 'EW32', name: 'Tuas West Road' },
    { code: 'EW33', name: 'Tuas Link' },
    { code: 'CG1',  name: 'Expo' },
    { code: 'CG2',  name: 'Changi Airport' },
  ]},
  { line: 'North-East Line', stations: [
    { code: 'NE1',  name: 'HarbourFront' },
    { code: 'NE3',  name: 'Outram Park' },
    { code: 'NE4',  name: 'Chinatown' },
    { code: 'NE5',  name: 'Clarke Quay' },
    { code: 'NE6',  name: 'Dhoby Ghaut' },
    { code: 'NE7',  name: 'Little India' },
    { code: 'NE8',  name: 'Farrer Park' },
    { code: 'NE9',  name: 'Boon Keng' },
    { code: 'NE10', name: 'Potong Pasir' },
    { code: 'NE11', name: 'Woodleigh' },
    { code: 'NE12', name: 'Serangoon' },
    { code: 'NE13', name: 'Kovan' },
    { code: 'NE14', name: 'Hougang' },
    { code: 'NE15', name: 'Buangkok' },
    { code: 'NE16', name: 'Sengkang' },
    { code: 'NE17', name: 'Punggol' },
  ]},
  { line: 'Circle Line', stations: [
    { code: 'CC1',  name: 'Dhoby Ghaut' },
    { code: 'CC2',  name: 'Bras Basah' },
    { code: 'CC3',  name: 'Esplanade' },
    { code: 'CC4',  name: 'Promenade' },
    { code: 'CC5',  name: 'Nicoll Highway' },
    { code: 'CC6',  name: 'Stadium' },
    { code: 'CC7',  name: 'Mountbatten' },
    { code: 'CC8',  name: 'Dakota' },
    { code: 'CC9',  name: 'Paya Lebar' },
    { code: 'CC10', name: 'MacPherson' },
    { code: 'CC11', name: 'Tai Seng' },
    { code: 'CC12', name: 'Bartley' },
    { code: 'CC13', name: 'Serangoon' },
    { code: 'CC14', name: 'Lorong Chuan' },
    { code: 'CC15', name: 'Bishan' },
    { code: 'CC16', name: 'Marymount' },
    { code: 'CC17', name: 'Caldecott' },
    { code: 'CC19', name: 'Botanic Gardens' },
    { code: 'CC20', name: 'Farrer Road' },
    { code: 'CC21', name: 'Holland Village' },
    { code: 'CC22', name: 'Buona Vista' },
    { code: 'CC23', name: 'one-north' },
    { code: 'CC24', name: 'Kent Ridge' },
    { code: 'CC25', name: 'Haw Par Villa' },
    { code: 'CC26', name: 'Pasir Panjang' },
    { code: 'CC27', name: 'Labrador Park' },
    { code: 'CC28', name: 'Telok Blangah' },
    { code: 'CC29', name: 'HarbourFront' },
    { code: 'CE1',  name: 'Bayfront' },
    { code: 'CE2',  name: 'Marina Bay' },
  ]},
  { line: 'Downtown Line', stations: [
    { code: 'DT1',  name: 'Bukit Panjang' },
    { code: 'DT2',  name: 'Cashew' },
    { code: 'DT3',  name: 'Hillview' },
    { code: 'DT5',  name: 'Beauty World' },
    { code: 'DT6',  name: 'King Albert Park' },
    { code: 'DT7',  name: 'Sixth Avenue' },
    { code: 'DT8',  name: 'Tan Kah Kee' },
    { code: 'DT9',  name: 'Botanic Gardens' },
    { code: 'DT10', name: 'Stevens' },
    { code: 'DT11', name: 'Newton' },
    { code: 'DT12', name: 'Little India' },
    { code: 'DT13', name: 'Rochor' },
    { code: 'DT14', name: 'Bugis' },
    { code: 'DT15', name: 'Promenade' },
    { code: 'DT16', name: 'Bayfront' },
    { code: 'DT17', name: 'Downtown' },
    { code: 'DT18', name: 'Telok Ayer' },
    { code: 'DT19', name: 'Chinatown' },
    { code: 'DT20', name: 'Fort Canning' },
    { code: 'DT21', name: 'Bencoolen' },
    { code: 'DT22', name: 'Jalan Besar' },
    { code: 'DT23', name: 'Bendemeer' },
    { code: 'DT24', name: 'Geylang Bahru' },
    { code: 'DT25', name: 'Mattar' },
    { code: 'DT26', name: 'MacPherson' },
    { code: 'DT27', name: 'Ubi' },
    { code: 'DT28', name: 'Kaki Bukit' },
    { code: 'DT29', name: 'Bedok North' },
    { code: 'DT30', name: 'Bedok Reservoir' },
    { code: 'DT31', name: 'Tampines West' },
    { code: 'DT32', name: 'Tampines' },
    { code: 'DT33', name: 'Tampines East' },
    { code: 'DT34', name: 'Upper Changi' },
    { code: 'DT35', name: 'Expo' },
  ]},
  { line: 'Thomson-East Coast Line', stations: [
    { code: 'TE1',  name: 'Woodlands North' },
    { code: 'TE2',  name: 'Woodlands' },
    { code: 'TE3',  name: 'Woodlands South' },
    { code: 'TE4',  name: 'Springleaf' },
    { code: 'TE5',  name: 'Lentor' },
    { code: 'TE6',  name: 'Mayflower' },
    { code: 'TE7',  name: 'Bright Hill' },
    { code: 'TE8',  name: 'Upper Thomson' },
    { code: 'TE9',  name: 'Caldecott' },
    { code: 'TE11', name: 'Stevens' },
    { code: 'TE12', name: 'Napier' },
    { code: 'TE13', name: 'Orchard Boulevard' },
    { code: 'TE14', name: 'Orchard' },
    { code: 'TE15', name: 'Great World' },
    { code: 'TE16', name: 'Havelock' },
    { code: 'TE17', name: 'Outram Park' },
    { code: 'TE18', name: 'Maxwell' },
    { code: 'TE19', name: 'Shenton Way' },
    { code: 'TE20', name: 'Marina Bay' },
    { code: 'TE22', name: 'Gardens by the Bay' },
    { code: 'TE23', name: 'Tanjong Rhu' },
    { code: 'TE24', name: 'Katong Park' },
    { code: 'TE25', name: 'Tanjong Katong' },
    { code: 'TE26', name: 'Marine Parade' },
    { code: 'TE27', name: 'Marine Terrace' },
    { code: 'TE28', name: 'Siglap' },
    { code: 'TE29', name: 'Bayshore' },
    { code: 'TE30', name: 'Bedok South' },
    { code: 'TE31', name: 'Sungei Bedok' },
  ]},
  { line: 'Sengkang LRT', stations: [
    { code: 'STC', name: 'Sengkang' },
    { code: 'SE1', name: 'Compassvale' },
    { code: 'SE2', name: 'Rumbia' },
    { code: 'SE3', name: 'Bakau' },
    { code: 'SE4', name: 'Kangkar' },
    { code: 'SE5', name: 'Ranggung' },
    { code: 'SW1', name: 'Cheng Lim' },
    { code: 'SW2', name: 'Farmway' },
    { code: 'SW3', name: 'Kupang' },
    { code: 'SW4', name: 'Thanggam' },
    { code: 'SW5', name: 'Fernvale' },
    { code: 'SW6', name: 'Layar' },
    { code: 'SW7', name: 'Tongkang' },
    { code: 'SW8', name: 'Renjong' },
  ]},
  { line: 'Punggol LRT', stations: [
    { code: 'PTC', name: 'Punggol' },
    { code: 'PE1', name: 'Cove' },
    { code: 'PE2', name: 'Meridian' },
    { code: 'PE3', name: 'Coral Edge' },
    { code: 'PE4', name: 'Riviera' },
    { code: 'PE5', name: 'Kadaloor' },
    { code: 'PE6', name: 'Oasis' },
    { code: 'PE7', name: 'Damai' },
    { code: 'PW1', name: 'Sam Kee' },
    { code: 'PW2', name: 'Teck Lee' },
    { code: 'PW3', name: 'Punggol Point' },
    { code: 'PW4', name: 'Samudera' },
    { code: 'PW5', name: 'Nibong' },
    { code: 'PW6', name: 'Sumang' },
    { code: 'PW7', name: 'Soo Teck' },
  ]},
  { line: 'Bukit Panjang LRT', stations: [
    { code: 'BP1',  name: 'Choa Chu Kang' },
    { code: 'BP2',  name: 'South View' },
    { code: 'BP3',  name: 'Keat Hong' },
    { code: 'BP4',  name: 'Teck Whye' },
    { code: 'BP5',  name: 'Phoenix' },
    { code: 'BP6',  name: 'Bukit Panjang' },
    { code: 'BP7',  name: 'Petir' },
    { code: 'BP8',  name: 'Pending' },
    { code: 'BP9',  name: 'Bangkit' },
    { code: 'BP10', name: 'Fajar' },
    { code: 'BP11', name: 'Segar' },
    { code: 'BP12', name: 'Jelapang' },
    { code: 'BP13', name: 'Senja' },
  ]},
]

const MOCK_TRIPS = {
  'EZ-1234567890': { origin: 'NS1 Jurong East', tapInTime: '07:30', concession: 'adult',   balance: 12.50 },
  'EZ-0987654321': { origin: 'EW23 Clementi',   tapInTime: '08:10', concession: 'student', balance: 3.20  },
  'EZ-TRANSFER':   { origin: 'EW21 Buona Vista', tapInTime: '07:40', concession: 'adult',  balance: 9.00, isTransfer: true, journeyDist: 4.2 },
}

function calcFare(km, concession, tapInTime, isTransfer = false, journeyDist = 0) {
  function deg(d) {
    if (d <= 3.2) return 0.77 + d * 0.12
    if (d <= 6.2) return 0.77 + 3.2 * 0.12 + (d - 3.2) * 0.09
    return 0.77 + 3.2 * 0.12 + 3.0 * 0.09 + (d - 6.2) * 0.07
  }
  const base = Math.round((isTransfer ? deg(journeyDist + km) - deg(journeyDist) : deg(km)) * 100) / 100
  const [h, m] = tapInTime.split(':').map(Number)
  const peak = (h < 7 || (h === 7 && m < 45)) ? Math.round(Math.min(0.50, base * 0.15) * 100) / 100 : 0
  const conPct = concession === 'student' ? 70 : 0
  const conDis = Math.round((base - peak) * conPct / 100 * 100) / 100
  const total  = Math.round((base - peak - conDis) * 100) / 100
  return {
    distanceKm: km.toFixed(1),
    baseFare: base.toFixed(2),
    peakDiscount: peak > 0 ? peak.toFixed(2) : null,
    concessionDiscount: conDis > 0 ? conDis.toFixed(2) : null,
    concessionPct: conPct > 0 ? conPct : null,
    isTransfer,
    total: total.toFixed(2),
  }
}

const form    = ref({ cardId: '', station: '' })
const loading = ref(false)
const result  = ref(null)

async function handleTapOut() {
  loading.value = true
  result.value  = null
  await new Promise(r => setTimeout(r, 700))

  const trip = MOCK_TRIPS[form.value.cardId.trim()]
  if (!trip) {
    result.value = { type: 'error', title: 'No active trip found', message: `Card "${form.value.cardId}" has no active tap-in. Try EZ-1234567890 or EZ-0987654321.` }
    loading.value = false; return
  }

  const distanceKm = parseFloat((2 + Math.random() * 12).toFixed(1))
  const fare = calcFare(distanceKm, trip.concession, trip.tapInTime, trip.isTransfer, trip.journeyDist)
  const newBalance = Math.max(0, trip.balance - parseFloat(fare.total))

  result.value = {
    type: 'success', title: 'Journey complete',
    message: `${trip.origin} → ${form.value.station}`,
    fare: { ...fare, newBalance: newBalance.toFixed(2) },
  }
  loading.value = false
}
</script>

<style scoped>
@import '@/assets/pages.css';

.station-dropdown { position: relative; }

.station-input {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--rs);
  background: var(--surface); cursor: pointer; transition: border-color 0.15s;
  gap: 8px; min-height: 38px;
}
.station-input:hover { border-color: #c0b8e8; }
.station-input.open  { border-color: var(--purple); }

.station-selected { display: flex; align-items: center; gap: 8px; }
.placeholder { font-size: 13px; color: var(--hint); }

.chevron {
  width: 14px; height: 14px; stroke: var(--muted); stroke-width: 2;
  fill: none; stroke-linecap: round; flex-shrink: 0; transition: transform 0.2s;
}
.chevron.rotated { transform: rotate(180deg); }

.station-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--rs); z-index: 50;
  max-height: 280px; overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
}

.line-header {
  padding: 8px 12px 4px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px; color: var(--hint);
  border-top: 1px solid var(--border); background: var(--bg);
}
.line-header:first-child { border-top: none; }

.station-option {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px; cursor: pointer; transition: background 0.1s;
}
.station-option:hover    { background: var(--bg); }
.station-option.selected { background: var(--purple-l); }

.dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.code  { font-size: 12px; font-weight: 600; color: var(--muted); min-width: 36px; flex-shrink: 0; }
.sname { font-size: 13px; font-weight: 500; color: var(--text); }

.fare-breakdown {
  background: rgba(255,255,255,.7); border-radius: 8px;
  padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; margin-top: 8px;
}
.fare-row {
  display: flex; justify-content: space-between;
  font-size: 12px; font-weight: 500; color: var(--text);
}
.fare-row--discount { color: var(--green-d); }
.fare-row--note     { color: var(--teal-d); font-style: italic; }
.fare-row--total {
  border-top: 1px solid var(--border); margin-top: 4px; padding-top: 5px;
  font-size: 13px; font-weight: 600;
}
.fare-row--balance { color: var(--muted); font-size: 12px; }
</style>