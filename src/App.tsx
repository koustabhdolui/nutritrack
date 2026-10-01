import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type Food = {
  id: number
  name: string
  time: string
  weight: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  accent: string
}

type Product = {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: Record<string, number>
}

type MacroKey = 'protein' | 'carbs' | 'fat'

const initialFoods: Food[] = [
  { id: 1, name: 'Greek yogurt + berries', time: '8:12 AM', weight: 250, calories: 285, protein: 22, carbs: 31, fat: 7, fiber: 4, accent: 'lavender' },
  { id: 2, name: 'Sourdough avocado toast', time: '12:46 PM', weight: 180, calories: 410, protein: 12, carbs: 48, fat: 20, fiber: 9, accent: 'sage' },
]

const goals = { calories: 2100, protein: 140, carbs: 230, fat: 72, fiber: 30 }

const dateKey = (date: Date) => date.toISOString().slice(0, 10)
const todayKey = dateKey(new Date())
const formatDate = (key: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`))
const storageKey = 'nutritrack-foods'

const readSavedFoods = (): Record<string, Food[]> => {
  try {
    const saved = localStorage.getItem(storageKey)
    const normalized = (foods: Food[]) => foods.map((food) => ({ ...food, weight: food.weight ?? 100, fiber: food.fiber ?? 0 }))
    if (!saved) return { [todayKey]: initialFoods }
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? { [todayKey]: normalized(parsed) } : parsed
  } catch {
    return { [todayKey]: initialFoods }
  }
}

function App() {
  const [foodsByDate, setFoodsByDate] = useState<Record<string, Food[]>>(readSavedFoods)
  const [showScanner, setShowScanner] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [notice, setNotice] = useState('')
  const [storageAvailable, setStorageAvailable] = useState(true)
  const foods = foodsByDate[selectedDate] ?? []
  const selectedDateOffset = Math.round((new Date(`${todayKey}T12:00:00`).getTime() - new Date(`${selectedDate}T12:00:00`).getTime()) / 86400000)
  const isToday = selectedDate === todayKey

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(foodsByDate))
      setStorageAvailable(true)
    } catch {
      setStorageAvailable(false)
    }
  }, [foodsByDate])

  const totals = useMemo(() => foods.reduce((sum, food) => ({
    calories: sum.calories + food.calories,
    protein: sum.protein + food.protein,
    carbs: sum.carbs + food.carbs,
    fat: sum.fat + food.fat,
    fiber: sum.fiber + food.fiber,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [foods])

  const addFood = (food: Omit<Food, 'id' | 'time'>) => {
    setFoodsByDate((current) => ({ ...current, [selectedDate]: [...(current[selectedDate] ?? []), { ...food, id: Date.now(), time: 'Just now' }] }))
    setShowScanner(false)
    setNotice(`${food.name} added to ${isToday ? 'today' : formatDate(selectedDate)}`)
    window.setTimeout(() => setNotice(''), 2600)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="NutriTrack home"><span className="mark">N</span>nutri<span>track</span></a>
        <nav className="topnav" aria-label="Main navigation"><a className="active" href="#log">Today</a><a href="#insights">Insights</a><a href="#settings">Settings</a></nav>
        <button className="avatar" aria-label="Open profile">KD</button>
      </header>
      {!storageAvailable && <div className="storage-warning" role="alert">This browser is blocking local storage. Your log may not survive a reload.</div>}
      <section className="hero" id="top">
        <div><p className="eyebrow">{isToday ? 'Today' : formatDate(selectedDate)}</p><h1>Make food<br /><em>count.</em></h1><p className="intro">A calm place to keep track of what fuels you.</p></div>
        <div className="date-control"><button aria-label="Previous day" disabled={selectedDateOffset >= 7} onClick={() => { const date = new Date(`${selectedDate}T12:00:00`); date.setDate(date.getDate() - 1); setSelectedDate(dateKey(date)) }}>‹</button><span>{isToday ? 'Today' : formatDate(selectedDate)}</span><button aria-label="Next day" disabled={isToday} onClick={() => { const date = new Date(`${selectedDate}T12:00:00`); date.setDate(date.getDate() + 1); setSelectedDate(dateKey(date)) }}>›</button></div>
      </section>

      <section className="summary-grid" aria-label="Daily nutrition summary">
        <div className="calorie-panel"><div className="panel-heading"><span>Energy balance</span><strong>{Math.max(goals.calories - totals.calories, 0)} <small>kcal left</small></strong></div><div className="calorie-track"><span style={{ width: `${Math.min((totals.calories / goals.calories) * 100, 100)}%` }} /></div><div className="track-labels"><span>{totals.calories.toLocaleString()} eaten</span><span>{goals.calories.toLocaleString()} goal</span></div></div>
        <div className="macro-panel"><div className="panel-heading"><span>Macros</span><span className="small-muted">{totals.calories} kcal total</span></div><div className="macro-list"><MacroRow label="Protein" value={totals.protein} goal={goals.protein} color="coral" /><MacroRow label="Carbs" value={totals.carbs} goal={goals.carbs} color="yellow" /><MacroRow label="Fat" value={totals.fat} goal={goals.fat} color="blue" /><MacroRow label="Fiber" value={totals.fiber} goal={goals.fiber} color="green" /></div></div>
      </section>

      <section className="content-grid" id="log">
        <div className="log-column"><div className="section-title"><div><p className="eyebrow">Your log</p><h2>{isToday ? "Today's food" : `${formatDate(selectedDate)} food`}</h2></div><span className="food-count">{foods.length} items</span></div><div className="food-list">{foods.map((food) => <FoodRow key={food.id} food={food} onRemove={() => setFoodsByDate((current) => ({ ...current, [selectedDate]: (current[selectedDate] ?? []).filter((item) => item.id !== food.id) }))} />)}</div><button className="add-food-button" onClick={() => setShowScanner(true)}><span>＋</span> Add food</button></div>
        <aside className="scan-card"><div className="scan-art"><span className="scan-corner top-left" /><span className="scan-corner top-right" /><span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" /><div className="barcode">▥</div><span className="scan-line" /></div><p className="eyebrow">Fast entry</p><h2>Scan a label.</h2><p>Point your camera at the nutrition facts. We’ll do the math for your serving.</p><button className="dark-button" onClick={() => setShowScanner(true)}>Open scanner <span>→</span></button><button className="search-food-button" onClick={() => setShowFoodSearch(true)}>Search prepared food <span>→</span></button><p className="privacy-note">Everything stays on this device.</p></aside>
      </section>

      <footer><span>NutriTrack / private by default</span><span>Built for your everyday</span></footer>
      {showScanner && <Scanner onClose={() => setShowScanner(false)} onAdd={addFood} />}
      {showFoodSearch && <FoodSearch onClose={() => setShowFoodSearch(false)} onAdd={addFood} />}
      {notice && <div className="toast" role="status">✓ {notice}</div>}
    </main>
  )
}

function MacroRow({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return <div className="macro-row"><div className="macro-label"><span className={`dot ${color}`} />{label}<strong>{value}g <small>/ {goal}g</small></strong></div><div className="macro-track"><span className={color} style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} /></div></div>
}

function FoodRow({ food, onRemove }: { food: Food; onRemove: () => void }) {
  return <article className="food-row"><div className={`food-icon ${food.accent}`}>{food.name.charAt(0)}</div><div className="food-main"><h3>{food.name}</h3><p>{food.time} <span>·</span> {food.weight} g eaten</p></div><div className="food-macros"><strong>{food.calories}</strong><span>kcal</span><div><b>{food.protein}p</b><b>{food.carbs}c</b><b>{food.fat}f</b><b>{food.fiber}fi</b></div></div><button className="remove-button" onClick={onRemove} aria-label={`Remove ${food.name}`}>×</button></article>
}

function FoodSearch({ onClose, onAdd }: { onClose: () => void; onAdd: (food: Omit<Food, 'id' | 'time'>) => void }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [weight, setWeight] = useState('100')
  const [selected, setSelected] = useState<Product | null>(null)
  const [status, setStatus] = useState('Search for a prepared food.')
  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!term.trim()) return
    setStatus('Searching Open Food Facts...')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(`/api/off-search?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=5`, { signal: controller.signal })
      if (!response.ok) throw new Error(`Search unavailable (${response.status})`)
      const data = await response.json()
      const products = (data.products ?? []).filter((product: Product) => product.product_name && product.nutriments?.['energy-kcal_100g'] !== undefined).slice(0, 5)
      setResults(products)
      setStatus(products.length ? 'Choose the closest match.' : 'No matching foods found.')
    } catch (error) {
      setResults([])
      setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'Search timed out. Try again.' : error instanceof Error ? error.message : 'Search unavailable. Try again.')
    } finally {
      window.clearTimeout(timeout)
    }
  }
  const addSelected = () => {
    if (!selected) return
    const nutrients = selected.nutriments ?? {}
    const multiplier = Number(weight) / 100
    onAdd({ name: selected.product_name || selected.brands || 'Prepared food', weight: Number(weight), calories: Math.round((nutrients['energy-kcal_100g'] ?? 0) * multiplier), protein: Math.round((nutrients.proteins_100g ?? 0) * multiplier), carbs: Math.round((nutrients.carbohydrates_100g ?? 0) * multiplier), fat: Math.round((nutrients.fat_100g ?? 0) * multiplier), fiber: Math.round((nutrients.fiber_100g ?? 0) * multiplier), accent: 'peach' })
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="food-search-title"><div className="modal"><button className="modal-close" onClick={onClose} aria-label="Close food search">×</button><p className="eyebrow">Prepared food</p><h2 id="food-search-title">Search the pantry.</h2><p className="modal-copy">Choose from the top five Open Food Facts matches.</p><form className="food-search-form" onSubmit={search}><input aria-label="Search foods" placeholder="chicken curry, cappuccino..." value={term} onChange={(event) => setTerm(event.target.value)} /><button className="search-button" type="submit">Search</button></form><p className="scanner-status" role="status">{status}</p><div className="search-results">{results.map((product) => <button className={`search-result ${selected?.code === product.code ? 'selected' : ''}`} key={product.code || product.product_name} onClick={() => setSelected(product)}><strong>{product.product_name}</strong><span>{product.brands || 'Open Food Facts'} · {product.nutriments?.['energy-kcal_100g'] ?? 0} kcal / 100 g</span></button>)}</div>{selected && <><label className="search-weight">Weight eaten (g)<input type="number" min="0.1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} /></label><button className="dark-button submit-button" onClick={addSelected}>Add selected food <span>→</span></button></>}</div></div>
}

function Scanner({ onClose, onAdd }: { onClose: () => void; onAdd: (food: Omit<Food, 'id' | 'time'>) => void }) {
  const [step, setStep] = useState<'scan' | 'details'>('scan')
  const [imageName, setImageName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [barcode, setBarcode] = useState('')
  const [status, setStatus] = useState('Point your camera at the barcode.')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({ name: 'New pantry find', weight: '100', calories: '240', protein: '10', carbs: '28', fat: '9', fiber: '0' })
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const weightMultiplier = Math.max(Number(form.weight) || 0, 0) / 100
  const calculated = { calories: Math.round(Number(form.calories || 0) * weightMultiplier), protein: Math.round(Number(form.protein || 0) * weightMultiplier), carbs: Math.round(Number(form.carbs || 0) * weightMultiplier), fat: Math.round(Number(form.fat || 0) * weightMultiplier), fiber: Math.round(Number(form.fiber || 0) * weightMultiplier) }
  const selectProduct = (product: Product) => {
    const nutrients = product.nutriments ?? {}
    setForm((current) => ({ ...current, name: product.product_name || product.brands || 'Prepared food', calories: String(nutrients['energy-kcal_100g'] ?? 0), protein: String(nutrients.proteins_100g ?? 0), carbs: String(nutrients.carbohydrates_100g ?? 0), fat: String(nutrients.fat_100g ?? 0), fiber: String(nutrients.fiber_100g ?? 0) }))
    setBarcode(product.code || '')
    setSearchResults([])
    setStatus('Food selected. Enter the grams you ate.')
    setStep('details')
  }
  const searchFoods = async (event: FormEvent) => {
    event.preventDefault()
    if (!searchTerm.trim()) return
    setSearching(true)
    setStatus('Searching Open Food Facts...')
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=5`)
      if (!response.ok) throw new Error('Food search failed')
      const result = await response.json()
      const products = (result.products ?? []).filter((product: Product) => product.product_name && product.nutriments?.['energy-kcal_100g'] !== undefined).slice(0, 5)
      setSearchResults(products)
      setStatus(products.length ? 'Choose the closest match.' : 'No matching foods found.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Food search failed')
    } finally {
      setSearching(false)
    }
  }
  const lookupBarcode = async (code: string) => {
    const normalizedCode = code.replace(/\D/g, '')
    if (!normalizedCode) return
    controlsRef.current?.stop()
    setBarcode(normalizedCode)
    setStatus('Looking up product nutrition...')
    try {
      const cacheKey = `nutritrack-barcode-${normalizedCode}`
      const cached = localStorage.getItem(cacheKey)
      const product = cached ? JSON.parse(cached) : await fetch(`https://world.openfoodfacts.org/api/v2/product/${normalizedCode}.json`).then(async (response) => {
        if (!response.ok) throw new Error('Product lookup failed')
        const result = await response.json()
        if (result.status !== 1 || !result.product) throw new Error('Product not found')
        localStorage.setItem(cacheKey, JSON.stringify(result.product))
        return result.product
      })
      const nutrients = product.nutriments ?? {}
      const calories = nutrients['energy-kcal_100g']
      const protein = nutrients.proteins_100g
      const carbs = nutrients.carbohydrates_100g
      const fat = nutrients.fat_100g
      const fiber = typeof nutrients.fiber_100g === 'number' ? nutrients.fiber_100g : 0
      if ([calories, protein, carbs, fat].some((value) => typeof value !== 'number')) throw new Error('Nutrition data is incomplete')
      setForm((current) => ({ ...current, name: product.product_name || product.brands || `Product ${normalizedCode}`, calories: String(Math.round(calories)), protein: String(protein), carbs: String(carbs), fat: String(fat), fiber: String(fiber) }))
      setStatus('Product found. Enter the grams you ate.')
      setStep('details')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Product lookup failed')
    }
  }
  useEffect(() => {
    if (step !== 'scan' || !videoRef.current) return
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera needs HTTPS. Open the https:// phone link, then allow camera access.')
      return
    }
    const reader = new BrowserMultiFormatReader()
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) void lookupBarcode(result.getText())
    }).then((controls) => { controlsRef.current = controls }).catch(() => setStatus('Camera unavailable. Enter the barcode below.'))
    return () => controlsRef.current?.stop()
  }, [step])
  const handleImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { setImageName(file.name); setImageUrl(URL.createObjectURL(file)); setStep('details') } }
  const submit = (event: FormEvent) => { event.preventDefault(); const multiplier = Number(form.weight) / 100; onAdd({ name: form.name || 'Scanned food', weight: Number(form.weight), calories: Math.round(Number(form.calories) * multiplier), protein: Math.round(Number(form.protein) * multiplier), carbs: Math.round(Number(form.carbs) * multiplier), fat: Math.round(Number(form.fat) * multiplier), fiber: Math.round(Number(form.fiber) * multiplier), accent: 'peach' }) }
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div className="modal"><button className="modal-close" onClick={onClose} aria-label="Close scanner">×</button>{step === 'scan' ? <><p className="eyebrow">Barcode lookup</p><h2 id="scanner-title">Find your food.</h2><p className="modal-copy">Scan the barcode to pull nutrition values per 100 g from Open Food Facts.</p><div className="camera-frame"><video ref={videoRef} muted playsInline aria-label="Barcode camera preview" /><span className="scan-line" /></div><p className="scanner-status" role="status">{status}</p><form className="barcode-form" onSubmit={(event) => { event.preventDefault(); void lookupBarcode(barcode) }}><input aria-label="Barcode" inputMode="numeric" placeholder="Enter barcode manually" value={barcode} onChange={(event) => setBarcode(event.target.value)} /><button className="dark-button" type="submit">Look up <span>→</span></button></form><label className="manual-link upload-link">Use a label photo instead<input type="file" accept="image/*" capture="environment" onChange={handleImage} /></label><button className="manual-link" onClick={() => setStep('details')}>Enter nutrition manually →</button></> : <form onSubmit={submit}><p className="eyebrow">{barcode ? `Barcode ${barcode}` : imageName ? 'Label captured' : 'Manual entry'}</p><h2 id="scanner-title">How much did you eat?</h2>{imageUrl && <div className="label-preview"><img src={imageUrl} alt="Captured nutrition label" /><span>Photo captured</span></div>}<p className="entry-note">{barcode ? 'Values loaded per 100 g. Enter the grams you ate.' : 'Enter the nutrition values listed per 100 g, then enter the grams you ate.'}</p><div className="form-grid"><label className="wide">Food name<input value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label>Weight eaten (g)<input type="number" min="0.1" step="0.1" value={form.weight} onChange={(event) => update('weight', event.target.value)} /></label><label>Calories / 100 g<input type="number" min="0" step="0.1" value={form.calories} onChange={(event) => update('calories', event.target.value)} /></label><label>Protein / 100 g<input type="number" min="0" step="0.1" value={form.protein} onChange={(event) => update('protein', event.target.value)} /></label><label>Carbs / 100 g<input type="number" min="0" step="0.1" value={form.carbs} onChange={(event) => update('carbs', event.target.value)} /></label><label>Fat / 100 g<input type="number" min="0" step="0.1" value={form.fat} onChange={(event) => update('fat', event.target.value)} /></label><label>Fiber / 100 g<input type="number" min="0" step="0.1" value={form.fiber} onChange={(event) => update('fiber', event.target.value)} /></label></div><div className="calculated-panel"><span>At {form.weight || 0} g eaten</span><strong>{calculated.calories} kcal</strong><div><b>{calculated.protein}p</b><b>{calculated.carbs}c</b><b>{calculated.fat}f</b><b>{calculated.fiber}fi</b></div></div><button className="dark-button submit-button" type="submit">Add to today's log <span>→</span></button></form>}</div></div>
}

export default App
