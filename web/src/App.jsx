import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, clearSession, getStoredUser, getToken, login, register } from './api';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import * as turf from '@turf/turf';
import RegistrationFlow from './RegistrationFlow';
import { Dashboard, DiseaseScan, Market, Marketplace, Chatbot, Schemes, Reports } from './Features';
import Satellite from './Satellite';
const navItems = [
  ['/', 'Overview', '⌂'], ['/weather', 'Weather', '☼'], ['/news', 'News', '📰'], ['/market-prices', 'Market prices', '↗'],
  ['/disease-scan', 'Crop health', '♧'], ['/satellite', 'Satellite Data', '🛰'], ['/farm-report', 'Farm reports', '▤'], ['/schemes', 'Schemes', '◎'],
  ['/marketplace', 'Marketplace', '◈'], ['/orders', 'Orders', '▣'], ['/inputs', 'Farm inputs', '◌'],
  ['/chatbot', 'Kisan assistant', '✦']
];

function App() {
  return <Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<RegistrationFlow />} /><Route element={<ProtectedLayout />}><Route path="*" element={<AppRoutes />} /></Route></Routes>;
}
function AppRoutes() { return <Routes><Route path="/" element={<Dashboard />} /><Route path="/weather" element={<Weather />} /><Route path="/news" element={<News />} /><Route path="/market-prices" element={<Market />} /><Route path="/disease-scan" element={<DiseaseScan />} /><Route path="/satellite" element={<Satellite />} /><Route path="/farm-report" element={<Reports />} /><Route path="/schemes" element={<Schemes />} /><Route path="/marketplace/*" element={<Marketplace />} /><Route path="/orders" element={<Orders />} /><Route path="/cart" element={<Cart />} /><Route path="/inputs" element={<Inputs />} /><Route path="/alerts" element={<Alerts />} /><Route path="/farm" element={<FarmProfile />} /><Route path="/chatbot" element={<Chatbot />} /><Route path="/notifications" element={<Notifications />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<NotFound />} /></Routes>; }

function ProtectedLayout() {
  const [open, setOpen] = useState(false); const location = useLocation(); const navigate = useNavigate();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const user = getStoredUser();
  function logout() { clearSession(); navigate('/login'); }
  return <div className="app-shell"><aside className={open ? 'sidebar open' : 'sidebar'}><div className="brand"><span className="brand-mark">✦</span><span>KISAN <b>AI</b></span></div><div className="side-label">WORKSPACE</div><nav>{navItems.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><span>{icon}</span>{label}</NavLink>)}</nav><div className="side-label">ACCOUNT</div><nav><NavLink to="/notifications" onClick={() => setOpen(false)}><span>♢</span>Notifications</NavLink><NavLink to="/profile" onClick={() => setOpen(false)}><span>◯</span>Profile</NavLink><NavLink to="/settings" onClick={() => setOpen(false)}><span>⚙</span>Settings</NavLink></nav><div className="side-bottom"><div className="help-card"><b>Need guidance?</b><small>Ask Kisan AI about your farm.</small><Link to="/chatbot">Open assistant →</Link></div><button className="logout" onClick={logout}>↪ <span>Sign out</span></button></div></aside><div className="main"><header className="topbar"><button className="menu" onClick={() => setOpen(!open)}>☰</button><div className="crumb">Workspace <span>/</span> <b>{titleFor(location.pathname)}</b></div><div className="top-actions"><button className="icon-btn" onClick={() => navigate('/notifications')}>♢<i /></button><div className="user-chip" onClick={() => navigate('/profile')}><Avatar name={user?.name} /><span>{user?.name || 'Farmer'}</span><small>⌄</small></div></div></header><main className="content"><Routes><Route path="*" element={<AppRoutes />} /></Routes></main></div></div>;
}
function titleFor(path) { const item = navItems.find(([to]) => to !== '/' && path.startsWith(to)); return item?.[1] || (path === '/' ? 'Overview' : 'Account'); }
function Avatar({ name = 'Farmer' }) { return <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>; }
function PageHead({ eyebrow, title, text, action, image }) {
  return (
    <div className="page-head" style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } : {}}>
      {image && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(11, 17, 14, 1) 10%, rgba(11, 17, 14, 0.4))', zIndex: 0 }} />}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 style={{ color: '#fff', textShadow: image ? '0 2px 4px rgba(0,0,0,0.5)' : 'none' }}>{title}</h1>
          {text && <p style={{ color: image ? '#e8f2eb' : undefined, textShadow: image ? '0 1px 2px rgba(0,0,0,0.5)' : 'none' }}>{text}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
function ErrorBox({ error }) { return error ? <div className="error-box">⚠ {error}</div> : null; }
function Loading() { return <div className="loading"><span /> Loading data…</div>; }

function AuthPage({ mode }) {
  const navigate = useNavigate(); const [form, setForm] = useState({ phone: '', password: '', name: '', email: '', role: 'farmer' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { const data = mode === 'login' ? await login(form.phone, form.password) : await register(form); if (!data?.user) localStorage.setItem('kisan_user', JSON.stringify({ name: form.name || 'Farmer', phone: form.phone })); navigate('/'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-brand"><span className="brand-mark">✦</span> KISAN <b>AI</b></div><div className="visual-copy"><div className="eyebrow">SMARTER FARMING, BETTER HARVESTS</div><h1>Make every<br /><em>acre count.</em></h1><p>Intelligent tools for the people who feed the world.</p></div><div className="visual-stat"><b>01</b><span>Weather, market intelligence<br />and crop insights in one place.</span></div></div><div className="auth-form-wrap"><div className="auth-form"><div className="mobile-brand"><span className="brand-mark">✦</span> KISAN <b>AI</b></div><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN KISAN AI'}</div><h2>{mode === 'login' ? 'Good to see you.' : 'Start growing smarter.'}</h2><p className="muted">{mode === 'login' ? 'Sign in to your farm workspace.' : 'Create your account and take control of your farm.'}</p><ErrorBox error={error} /><form onSubmit={submit}>{mode === 'register' && <Field label="Full name" placeholder="Your name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />}{mode === 'register' && <Field label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={v => setForm({ ...form, email: v })} />}{mode === 'register' && <label className="field"><span>Account type</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="farmer">Farmer</option><option value="supplier">Supplier</option><option value="buyer">Buyer</option></select></label>}<Field label="Phone number" placeholder="10-digit phone number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} required /><Field label="Password" type="password" placeholder="At least 6 characters" value={form.password} onChange={v => setForm({ ...form, password: v })} required /><button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to workspace →' : 'Create account →'}</button></form><p className="switch">{mode === 'login' ? 'New to Kisan AI?' : 'Already have an account?'} <Link to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p></div></div></div>;
}
function Field({ label, type = 'text', placeholder, value, onChange, required }) { return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required={required} /></label>; }

/* Dashboard moved to Features.jsx */
function Stat({ label, value, hint, tone = '', icon }) { return <Card className="stat"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><strong>{value}</strong><small>{hint}</small></Card>; }
function PanelTitle({ title, link }) { return <div className="panel-title"><h3>{title}</h3>{link && <Link to={link}>View all →</Link>}</div>; }
function Quick({ to, icon, title, text }) { return <Link to={to} className="quick"><span>{icon}</span><div><b>{title}</b><small>{text}</small></div><i>→</i></Link>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }

function Weather() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('kisan_farm_profile') || '{}');
      const city = profile.district || profile.state || 'Your farm';
      const lat = profile.lat ? parseFloat(profile.lat).toFixed(2) : '20.59';
      const lng = profile.lng ? parseFloat(profile.lng).toFixed(2) : '78.96';
      
      const aqiVal = Math.floor(Math.random() * 50) + 40;
      
      // Generate deterministic forecast data
      const baseTemp = 26;
      const forecastData = ['Today','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
        const temp = baseTemp + Math.floor(Math.sin(i) * 5);
        const hourly = Array.from({length: 16}, (_, hrIndex) => {
          const hour = hrIndex + 6; // Starts at 06:00
          const timeStr = `${hour.toString().padStart(2, '0')}:00`;
          let icon = '☼';
          if (hour >= 18 || hour < 6) icon = '☽';
          else if (i % 3 === 1) icon = '☁';
          
          let tempOffset = -5; // early morning
          if (hour > 10 && hour <= 15) tempOffset = +2;
          else if (hour > 15 && hour < 18) tempOffset = 0;
          else if (hour >= 18 && hour < 21) tempOffset = -2;
          else if (hour >= 21) tempOffset = -4;

          return { time: timeStr, temp: temp + tempOffset, icon };
        });
        return {
          day,
          temperature: temp,
          condition: i % 3 === 1 ? 'Cloudy' : 'Clear',
          icon: i % 3 === 1 ? '☁' : '☼',
          hourly
        };
      });

      setData({
        temperature: forecastData[0].temperature,
        description: 'Sunny',
        humidity: Math.floor(Math.random() * 20) + 50,
        wind_speed: `${Math.floor(Math.random() * 10) + 5} km/h`,
        precip: Math.floor(Math.random() * 30),
        pressure: Math.floor(Math.random() * 20) + 1000,
        aqi: aqiVal,
        aqiStatus: aqiVal < 50 ? 'Good' : 'Moderate',
        city: city,
        coordinates: `${lat}, ${lng}`,
        forecast: forecastData
      });
    } catch (e) {
      setError(e.message);
    }
  }, []);
  
  return (
    <>
      <PageHead 
        eyebrow="FIELD CONDITIONS" 
        title="Weather intelligence" 
        text="Make better decisions with conditions from your farm region." 
        image="https://images.unsplash.com/photo-1561553590-267fc716698a?auto=format&fit=crop&w=1200&q=80"
        action={<button className="secondary" onClick={() => window.location.reload()}>↻ Refresh</button>} 
      />
      <ErrorBox error={error} />
      <div className="weather-hero">
        <div>
          <span className="weather-symbol">☼</span>
          <div className="eyebrow">CURRENT CONDITIONS</div>
          <div className="temp">{data?.temperature || '—'}<sup>°C</sup></div>
          <p>{data?.description || 'Weather data is ready when your location is connected.'}</p>
        </div>
        <div className="weather-meta">
          <div><small>HUMIDITY</small><b>{data?.humidity ? `${data.humidity}%` : '—'}</b></div>
          <div><small>WIND</small><b>{data?.wind_speed || '—'}</b></div>
          <div><small>PRECIPITATION</small><b>{data?.precip}%</b></div>
          <div><small>PRESSURE</small><b>{data?.pressure} hPa</b></div>
          <div><small>AQI</small><b>{data?.aqi} ({data?.aqiStatus})</b></div>
          <div><small>LOCATION</small><b>{data?.city}</b><small style={{display:'block', marginTop:'4px'}}>{data?.coordinates}</small></div>
        </div>
      </div>
      
      <Card style={{ marginBottom: '24px' }}>
        <PanelTitle title={`${data?.forecast?.[activeDay]?.day || 'Today'}'s Hourly Forecast`} />
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {data?.forecast?.[activeDay]?.hourly?.map((h, i) => (
            <div key={i} style={{ textAlign: 'center', background: '#121b16', padding: '16px', borderRadius: '8px', minWidth: '80px', border: '1px solid #29372d' }}>
              <div style={{ color: '#a5b7a6', fontSize: '13px', marginBottom: '8px' }}>{h.time}</div>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{h.icon}</div>
              <div style={{ color: '#f0f6ec', fontWeight: 'bold' }}>{h.temp}°C</div>
            </div>
          ))}
        </div>
      </Card>
      
      <Card>
        <PanelTitle title="7-day outlook" />
        <div className="forecast">
          {data?.forecast?.map((dayObj, i) => (
            <div 
              key={i} 
              className={i === activeDay ? 'forecast-day active' : 'forecast-day'}
              onClick={() => setActiveDay(i)}
              style={{ cursor: 'pointer', transition: '0.2s', transform: i === activeDay ? 'scale(1.05)' : 'scale(1)' }}
            >
              <b>{dayObj.day}</b>
              <span>{dayObj.icon}</span>
              <strong>{dayObj.temperature}°</strong>
              <small>{dayObj.condition}</small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function News() {
  const articles = [
    { title: 'New MSP announced for Rabi Crops', source: 'AgriNews', url: 'https://krishijagran.com/', date: '2 hrs ago', desc: 'Government has increased the Minimum Support Price for upcoming Rabi crops.' },
    { title: 'Subsidies increased for solar water pumps under PM-KUSUM', source: 'Govt Portal', url: 'https://pmkisan.gov.in/', date: '5 hrs ago', desc: 'Farmers can now avail up to 60% subsidy on standalone solar agriculture pumps.' },
    { title: 'Monsoon forecast: Above average rainfall expected this season', source: 'Weather Dept', url: 'https://mausam.imd.gov.in/', date: '1 day ago', desc: 'IMD predicts favorable monsoon conditions across the central peninsula.' },
    { title: 'New organic certification process simplified', source: 'Organic India', url: 'https://apeda.gov.in/', date: '2 days ago', desc: 'The application for PGS-India organic certification can now be completed online in fewer steps.' },
    { title: 'Export duty on onions slashed to 20%', source: 'Economic Times', url: 'https://economictimes.indiatimes.com/', date: '2 days ago', desc: 'In a major relief to farmers, the central government has cut the export duty on onions from 40% to 20%.' },
    { title: 'Drone technology subsidies for FPOs', source: 'Kisan Portal', url: 'https://agricoop.nic.in/', date: '3 days ago', desc: 'Farmer Producer Organizations can now claim up to 75% subsidy for purchasing agricultural drones.' },
    { title: 'Cotton prices surge globally due to short supply', source: 'AgriWatch', url: 'https://www.agriwatch.com/', date: '4 days ago', desc: 'Global cotton prices have seen a 15% surge as unseasonal rains affect yields in major producing nations.' },
    { title: 'State government launches free soil testing drive', source: 'State Dept', url: 'https://soilhealth.dac.gov.in/', date: '5 days ago', desc: 'Mobile soil testing vans will visit villages to provide free soil health cards to farmers on the spot.' },
    { title: 'Nano Urea adoption increases crop yield by 8%', source: 'IFFCO News', url: 'https://www.iffco.in/', date: '1 week ago', desc: 'A recent study shows that replacing one bag of conventional urea with Nano Urea can boost productivity.' },
    { title: 'Digital Mandi integration connects 100 new APMCs', source: 'e-NAM', url: 'https://enam.gov.in/', date: '1 week ago', desc: 'The National Agriculture Market (e-NAM) has successfully integrated 100 more APMCs across the country.' }
  ];
  return (
    <>
      <PageHead 
        eyebrow="LATEST UPDATES" 
        title="Agriculture News" 
        text="Stay informed about the latest trends, prices, and policies." 
        image="https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=1200&q=80"
      />
      <div className="two-col">
        {articles.map((a, i) => (
          <Card key={i}>
            <h3 style={{ margin: '0 0 8px 0' }}>{a.title}</h3>
            <p style={{ color: '#8da394', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>{a.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#6e8877' }}>{a.source} · {a.date}</small>
              <a href={a.url} target="_blank" rel="noreferrer" className="primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '24px' }}>Read Article ↗</a>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* Market moved to Features.jsx */


function Orders() {
  const [rows, setRows] = useState([]);
  
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('kisan_orders') || '[]');
      setRows(stored);
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  return (
    <>
      <PageHead eyebrow="MARKETPLACE" title="Your orders" text="Track purchases and marketplace activity in one place." action={<Link className="secondary" to="/marketplace">Browse marketplace</Link>} image="https://images.unsplash.com/photo-1586771107445-d3af07311756?auto=format&fit=crop&w=1200&q=80" />
      <Card>
        <PanelTitle title="Order history" />
        {rows.length ? (
          <div className="data-table">
            <div className="table-head">
              <span>ORDER ID</span>
              <span>ITEM</span>
              <span>AMOUNT</span>
              <span>IPFS RECEIPT LINK</span>
            </div>
            {rows.map((r, i) => (
              <div className="table-row" style={{ alignItems: 'center' }} key={r.id || i}>
                <b>#{r.id}</b>
                <span>{r.name}</span>
                <strong>₹{r.price}</strong>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  if (r.ipfsLink && r.ipfsLink.startsWith('data:')) {
                    const newWindow = window.open();
                    newWindow.document.write(decodeURIComponent(r.ipfsLink.replace('data:text/html;charset=utf-8,', '')));
                    newWindow.document.close();
                  } else {
                    window.open(r.ipfsLink, '_blank');
                  }
                }} style={{ color: '#10b981', textDecoration: 'underline', fontSize: '12px', cursor: 'pointer' }}>
                  {r.ipfsLink && r.ipfsLink.startsWith('data:') ? 'View Smart Contract Receipt ↗' : r.ipfsLink}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No orders found. Your purchases will appear here." />
        )}
      </Card>
    </>
  );
}

function Cart() { const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('kisan_cart') || '[]'); } catch { return []; } }); const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0); function clearCart() { setItems([]); localStorage.removeItem('kisan_cart'); } return <><PageHead eyebrow="MARKETPLACE" title="Your cart" text="Review selected items before placing an order." action={<Link className="secondary" to="/marketplace">Continue shopping</Link>} image="https://images.unsplash.com/photo-1605000794699-6660659dcb59?auto=format&fit=crop&w=1200&q=80" /><Card><PanelTitle title={`${items.length} item${items.length === 1 ? '' : 's'}`} />{items.length ? <><div className="cart-list">{items.map((item, i) => <div className="cart-row" key={item.id || i}><div><b>{item.title || item.name || 'Marketplace item'}</b><small>{item.unit || 'unit'} · Qty {item.quantity || 1}</small></div><strong>₹{Number(item.price || 0) * Number(item.quantity || 1)}</strong></div>)}</div><div className="cart-total"><span>Total</span><strong>₹{total}</strong></div><div className="form-actions"><button className="secondary" onClick={clearCart}>Clear cart</button><button className="primary" disabled>Checkout requires payment configuration</button></div></> : <Empty text="Your cart is empty. Add items from the marketplace to begin." />}</Card></>; }

function Inputs() { const [inventory, setInventory] = useState([]); const [usage, setUsage] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [form, setForm] = useState({ item_id: '', quantity: '' }); useEffect(() => { Promise.all([api('/input/inventory'), api('/input/usage-history')]).then(([inventoryData, usageData]) => { const first = inventoryData?.data || inventoryData?.inventory || inventoryData; const second = usageData?.data || usageData?.history || usageData; setInventory(Array.isArray(first) ? first : []); setUsage(Array.isArray(second) ? second : []); }).catch(e => setError(e.message)); }, []); async function useInput(event) { event.preventDefault(); setBusy(true); setError(''); try { await api('/input/use', { method: 'POST', body: JSON.stringify({ ...form, quantity: Number(form.quantity) }) }); setForm({ item_id: '', quantity: '' }); const data = await api('/input/inventory'); const rows = data?.data || data?.inventory || data; setInventory(Array.isArray(rows) ? rows : []); } catch (e) { setError(e.message); } finally { setBusy(false); } } return <><PageHead eyebrow="FARM OPERATIONS" title="Manage farm inputs." text="Track inventory and record input usage without losing the season's details." image="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80" /><ErrorBox error={error} /><div className="two-col"><Card><PanelTitle title="Inventory" />{inventory.length ? inventory.map((item, i) => <div className="status-line" key={item.id || i}><b>{item.name || item.item_name || 'Input'}</b><span className="input-quantity">{item.quantity ?? item.stock ?? '—'} {item.unit || ''}</span></div>) : <Empty text="No inventory records available." />}</Card><Card><PanelTitle title="Record usage" /><form onSubmit={useInput}><Field label="Input ID" placeholder="Inventory item ID" value={form.item_id} onChange={value => setForm({ ...form, item_id: value })} required /><Field label="Quantity used" type="number" placeholder="0" value={form.quantity} onChange={value => setForm({ ...form, quantity: value })} required /><button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Record usage'}</button></form><h3 className="subheading">Recent usage</h3>{usage.slice(0, 4).map((item, i) => <div className="status-line" key={item.id || i}>{item.item_name || item.name || 'Input used'} <span>{item.quantity || '—'}</span></div>)}</Card></div></>; }

function Alerts() { const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [form, setForm] = useState({ commodity: '', target_price: '' }); const [busy, setBusy] = useState(false); async function load() { try { const d = await api('/market-intelligence/alerts'); const r = d?.data || d?.alerts || d; setRows(Array.isArray(r) ? r : []); } catch (e) { setError(e.message); } } useEffect(() => { load(); }, []); async function add(event) { event.preventDefault(); setBusy(true); setError(''); try { await api('/market-intelligence/alerts', { method: 'POST', body: JSON.stringify({ ...form, target_price: Number(form.target_price) }) }); setForm({ commodity: '', target_price: '' }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } } async function remove(id) { try { await api(`/market-intelligence/alerts/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); } } return <><PageHead eyebrow="MARKET INTELLIGENCE" title="Price alerts" text="Set a target and let the market watch it for you." image="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80" /><ErrorBox error={error} /><div className="two-col"><Card><PanelTitle title="Create an alert" /><form onSubmit={add}><Field label="Commodity" placeholder="e.g. Wheat" value={form.commodity} onChange={value => setForm({ ...form, commodity: value })} required /><Field label="Target price" type="number" placeholder="₹ per quintal" value={form.target_price} onChange={value => setForm({ ...form, target_price: value })} required /><button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Set price alert'}</button></form></Card><Card><PanelTitle title="Active alerts" />{rows.length ? rows.map((row, i) => <div className="alert-row" key={row.id || i}><div><b>{row.commodity || row.crop || 'Commodity'}</b><small>Target ₹{row.target_price || row.price || '—'}</small></div><button className="text-button" onClick={() => remove(row.id)}>Remove</button></div>) : <Empty text="No active alerts." />}</Card></div></>; }

function FarmBoundaryMap({ onBoundaryChange }) {
  const [points, setPoints] = useState([]);
  const [metrics, setMetrics] = useState({ area: 0, perimeter: 0 });

  function calculateMetrics(pts) {
    if (pts.length < 3) return { area: 0, perimeter: 0 };
    try {
      const coords = pts.map(p => [p[1], p[0]]); // [lng, lat]
      coords.push([pts[0][1], pts[0][0]]); // Close polygon
      const poly = turf.polygon([coords]);
      const areaSqm = turf.area(poly);
      const perimeterM = turf.length(poly, { units: 'kilometers' }) * 1000;
      return { area: (areaSqm / 10000).toFixed(2), perimeter: perimeterM.toFixed(1) };
    } catch(err) {
      return { area: 0, perimeter: 0 };
    }
  }

  function MapEvents() {
    useMapEvents({
      click(e) {
        const newPoints = [...points, [e.latlng.lat, e.latlng.lng]];
        setPoints(newPoints);
        if (newPoints.length >= 3) {
          setMetrics(calculateMetrics(newPoints));
        }
      }
    });
    return null;
  }

  function submitMap() {
      const acres = (metrics.area * 2.47105).toFixed(2);
      onBoundaryChange(acres, points);
  }

  function clearMap() {
      setPoints([]);
      setMetrics({ area: 0, perimeter: 0 });
      onBoundaryChange('', []);
  }

  return (
    <div style={{ position: 'relative', height: '500px', width: '100%', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1a2235' }}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 1, paddingBottom: '160px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
        {points.map((p, i) => <Marker key={i} position={p} />)}
        {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.4 }} />}
      </MapContainer>
      
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: '#0f172a', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#0f172a', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Points</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{points.length}</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#0f172a', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Area</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{metrics.area} ha</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#0f172a', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Perimeter</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{metrics.perimeter} m</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button type="button" style={{ background: '#1e293b', color: '#10b981', padding: '12px 16px', borderRadius: '24px', fontWeight: 'bold', border: 'none', flex: 1, cursor: 'pointer' }} onClick={() => alert('Tap on the map to add a point!')}>
            📍 Mark Corner
          </button>
          <button type="button" style={{ background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} onClick={clearMap}>
            🗑
          </button>
          <button type="button" style={{ background: '#10b981', color: 'white', padding: '12px 16px', borderRadius: '24px', fontWeight: 'bold', border: 'none', flex: 1, cursor: 'pointer' }} onClick={submitMap}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function FarmProfile() { const user = getStoredUser(); const [profile, setProfile] = useState(null); const [crops, setCrops] = useState([]); const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [form, setForm] = useState({ land_size: '', soil_type: '', water_source: '' }); useEffect(() => { if (!user?.id) return; Promise.all([api(`/farm-profile/${user.id}`), api(`/farm-profile/${user.id}/crops`)]).then(([profileData, cropData]) => { const p = profileData?.data || profileData?.profile || profileData; const c = cropData?.data || cropData?.crops || cropData; setProfile(p); setCrops(Array.isArray(c) ? c : []); setForm({ land_size: p?.land_size || '', soil_type: p?.soil_type || '', water_source: p?.water_source || '' }); }).catch(e => setError(e.message)); }, [user?.id]); async function save(event) { event.preventDefault(); setSaved(false); setError(''); try { await api(`/farm-profile/${user.id}`, { method: 'POST', body: JSON.stringify(form) }); setProfile(form); setSaved(true); } catch (e) { setError(e.message); } } return <><PageHead eyebrow="FARM PROFILE" title="Your farm, your baseline." text="Keep land and crop details current for better reports and recommendations." image="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80" /><ErrorBox error={error} />{saved && <div className="success-box">Farm profile saved successfully.</div>}<div className="two-col"><Card><PanelTitle title="Land details" /><form onSubmit={save}><FarmBoundaryMap onBoundaryChange={(acres) => setForm({...form, land_size: acres})} /><Field label="Calculated Land size (acres)" type="number" placeholder="0" value={form.land_size} onChange={value => setForm({ ...form, land_size: value })} /><Field label="Soil type" placeholder="e.g. Loamy" value={form.soil_type} onChange={value => setForm({ ...form, soil_type: value })} /><Field label="Water source" placeholder="e.g. Borewell" value={form.water_source} onChange={value => setForm({ ...form, water_source: value })} /><button className="primary">Save farm profile</button></form></Card><Card><PanelTitle title="Active crops" />{crops.length ? crops.map((crop, i) => <div className="status-line" key={crop.id || i}><b>{crop.name || crop.crop_name || 'Crop'}</b><span>{crop.season || crop.status || ''}</span></div>) : <Empty text="No crops added yet. Add crops through the crop management API." />}</Card></div></>; }

/* Chatbot moved to Features.jsx */
function Notifications() { return <><PageHead eyebrow="UPDATES" title="Notifications" text="Stay on top of the things that need your attention." image="https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=1200&q=80" /><Card><Empty text="You’re all caught up. New weather alerts, price movements and reports will appear here." /></Card></>; }
function Profile() { 
  const user = getStoredUser() || {}; 
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('kisan_profile_pic') || null);
  
  let farmProfile = {};
  try {
    farmProfile = JSON.parse(localStorage.getItem('kisan_farm_profile') || '{}');
  } catch (e) {}

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        localStorage.setItem('kisan_profile_pic', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <PageHead eyebrow="ACCOUNT" title="Your profile" text="Keep your details current so Kisan AI can personalise your guidance." action={<Link className="primary" to="/settings">Edit profile</Link>} image="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80" />
      
      <Card className="profile-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          {profilePic ? (
            <img src={profilePic} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }} />
          ) : (
            <Avatar name={user.name || 'Farmer'} />
          )}
          <label style={{ position: 'absolute', bottom: '-8px', right: '-8px', background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', border: '2px solid #0f172a' }}>
            Edit
            <input type="file" accept="image/*" onChange={handlePicUpload} style={{ display: 'none' }} />
          </label>
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px 0' }}>{user.name || 'Farmer'}</h2>
          <p style={{ margin: 0, color: '#8da394' }}>{user.phone || 'No phone number saved'} · {user.email || 'No email saved'}</p>
        </div>
      </Card>
      
      <div className="two-col">
        <Card>
          <PanelTitle title="Farm profile" />
          {Object.keys(farmProfile).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Location</span>
                <strong>{farmProfile.district || farmProfile.state || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Land Size</span>
                <strong>{farmProfile.land_size ? `${farmProfile.land_size} Acres` : 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Primary Crop</span>
                <strong>{farmProfile.cropName || farmProfile.selectedAiCrop || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Soil Type</span>
                <strong>{farmProfile.soil || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Water Source</span>
                <strong>{farmProfile.waterSource || farmProfile.water_source || 'N/A'}</strong>
              </div>
            </div>
          ) : (
            <Empty text="Complete your farm details to unlock personalised recommendations." />
          )}
        </Card>
        <Card>
          <PanelTitle title="Account status" />
          <div className="status-line"><span className="status-dot" /> Account active</div>
          <div className="status-line">⌁ Member since today</div>
        </Card>
      </div>
    </>
  ); 
}
function Settings() { const [saved, setSaved] = useState(false); return <><PageHead eyebrow="PREFERENCES" title="Settings" text="Manage your workspace preferences." image="https://images.unsplash.com/photo-1605000794699-6660659dcb59?auto=format&fit=crop&w=1200&q=80" /><Card className="settings-card"><h3>Notifications</h3><label className="toggle-row"><span><b>Weather alerts</b><small>Get notified about important conditions.</small></span><input type="checkbox" defaultChecked /></label><label className="toggle-row"><span><b>Market movements</b><small>Receive updates for tracked commodities.</small></span><input type="checkbox" defaultChecked /></label><h3>Language</h3><select><option>English</option><option>Hindi</option><option>Marathi</option></select><button className="primary" onClick={() => setSaved(true)}>{saved ? 'Saved ✓' : 'Save preferences'}</button></Card></>; }
/* Satellite moved to Satellite.jsx */
function NotFound() { return <div className="not-found"><h1>404</h1><p>This page does not exist.</p><Link className="primary" to="/">Back to overview</Link></div>; }
export default App;
