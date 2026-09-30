import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getStoredUser, api } from './api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function FeatureHeader({ eyebrow, title, text, image, action }) {
  return (
    <div className="page-head" style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } : {}}>
      {image && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(11, 17, 14, 1) 10%, rgba(11, 17, 14, 0.4))', zIndex: 0 }} />}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 style={{ color: '#fff', textShadow: image ? '0 2px 4px rgba(0,0,0,0.5)' : 'none', margin: '0 0 8px 0', fontSize: '32px' }}>{title}</h1>
          {text && <p style={{ color: image ? '#e8f2eb' : undefined, textShadow: image ? '0 1px 2px rgba(0,0,0,0.5)' : 'none', margin: 0 }}>{text}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// Mock Profile for Advanced Features Context
const getMockProfile = () => {
  try {
     const p = JSON.parse(localStorage.getItem('kisan_farm_profile')) || { state: 'Maharashtra', land_size: 4, cropName: 'Wheat', soil: 'Loamy' };
     p.cropName = p.cropName || p.selectedAiCrop || 'Wheat';
     return p;
  } catch {
     return { state: 'Maharashtra', land_size: 4, cropName: 'Wheat', soil: 'Loamy' };
  }
};

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); }
  }, []);
  
  if (!offline) return null;
  return (
    <div style={{ background: '#f59e0b', color: '#fff', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', position: 'sticky', top: 0, zIndex: 9999 }}>
      ⚠️ You are offline. App is running via Service Worker (Edge). Changes will sync when connectivity is restored.
    </div>
  );
}

export function Dashboard() {
  const user = getStoredUser(); 
  const role = user?.role || 'farmer';
  const navigate = useNavigate();

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '16px', background: '#f8fafc', minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <OfflineBanner />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{greeting}, {user?.name?.split(' ')[0] || 'Farmer'} 🌾</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Maharashtra · {dateStr}</p>
        </div>
        <button style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔔</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div onClick={() => navigate('/market-prices')} style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#00E676', fontSize: '20px' }}>📈</span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Wheat Price</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>₹2450/q</div>
        </div>
        <div onClick={() => navigate('/weather')} style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#64B5F6', fontSize: '20px' }}>⛅</span>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Weather</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>28°C</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Partly Cloudy</div>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '16px' }}>Quick Access</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
        
        <div onClick={() => navigate('/market-prices')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#e6f9ed', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>📊</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Market<br/>Prices</div>
        </div>
        
        {role !== 'buyer' && role !== 'seller' && (
          <div onClick={() => navigate('/disease-scan')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#ffecec', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>🔬</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Disease<br/>Detection</div>
          </div>
        )}
        
        {role !== 'buyer' && role !== 'seller' && (
          <div onClick={() => navigate('/farm-report')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#eef2ff', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>📋</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Farm<br/>Report</div>
          </div>
        )}
        
        <div onClick={() => navigate('/marketplace')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fef3c7', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>🏪</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Market<br/>Place</div>
        </div>

        <div onClick={() => navigate('/chatbot')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#f3e8ff', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>💬</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Agri<br/>Assistant</div>
        </div>

        {role !== 'buyer' && role !== 'seller' && (
          <div onClick={() => navigate('/weather')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#e0f2fe', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>☀️</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Weather<br/>Forecast</div>
          </div>
        )}

        {role !== 'buyer' && role !== 'seller' && (
          <div onClick={() => navigate('/schemes')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#dcfce7', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>🏛️</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Govt<br/>Schemes</div>
          </div>
        )}
        
        {role !== 'buyer' && role !== 'seller' && (
          <div onClick={() => navigate('/satellite')} style={{ background: '#fff', padding: '16px 8px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#fce7f3', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '24px' }}>🛰️</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>NDVI<br/>Mapping</div>
          </div>
        )}

      </div>
    </div>
  );
}

export function DiseaseScan() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const profile = getMockProfile();

  async function handleFile(e) {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setBusy(true);
      setResult(null);
      
      const isOffline = !navigator.onLine;
      setTimeout(() => {
        setResult({ 
          name: 'Apple Scab', 
          confidence: '92%', 
          symptoms: ['Olive-green spots on leaves', 'Dark, scabby lesions on fruit', 'Premature leaf drop'],
          causes: ['Fungus: Venturia inaequalis', 'High humidity and rainfall', 'Poor air circulation in canopy'],
          treatments: [
            'Immediate: Apply Mancozeb or Captan fungicides.', 
            'Cultural: Prune and destroy infected leaves immediately.',
            'Preventive: Ensure proper tree spacing for air flow.',
            'Chemical: Use systemic fungicides (like Myclobutanil) if infection spreads.'
          ],
          offlineMode: isOffline
        });
        setBusy(false);
      }, 2000);
    }
  }

  return (
    <>
      <FeatureHeader 
        eyebrow="AI DIAGNOSTICS" 
        title="Disease Scanner" 
        text="Identify crop issues instantly using edge AI."
        image="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80"
      />
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <OfflineBanner />
      
      {!result && !busy && (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#121b16', border: '2px dashed #334637', borderRadius: '12px', padding: '48px 24px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>📷</span>
          <h3 style={{ margin: '0 0 8px 0', color: '#f0f6ec' }}>Upload Image</h3>
          <p style={{ margin: 0, color: '#8da394', fontSize: '13px' }}>AI optimized for your {profile.cropName}</p>
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      )}

      {busy && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#121b16', borderRadius: '12px', padding: '48px 24px', border: '1px solid #29372d', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <style>{`@keyframes scanPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }`}</style>
          <span style={{ fontSize: '48px', marginBottom: '16px', animation: 'scanPulse 1s infinite' }}>🔬</span>
          <h3 style={{ margin: 0, color: '#e46f6f' }}>{navigator.onLine ? 'Cloud AI Scanning...' : 'Local Edge TFLite Scanning...'}</h3>
          <p style={{ margin: '8px 0 0 0', color: '#8da394', fontSize: '13px' }}>Using prior context: {profile.cropName}</p>
        </div>
      )}

      {result && !busy && (
        <div style={{ background: '#121b16', borderRadius: '12px', overflow: 'hidden', border: '1px solid #29372d', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ background: '#e46f6f', color: '#fff', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', opacity: 0.9 }}>Detected Disease</div>
              <h2 style={{ margin: 0, fontSize: '28px' }}>{result.name}</h2>
              {result.offlineMode && <div style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>TFLite Edge Model</div>}
            </div>
            <div style={{ background: '#fff', color: '#e46f6f', padding: '6px 12px', borderRadius: '24px', fontWeight: 'bold', fontSize: '16px' }}>{result.confidence} Match</div>
          </div>
          <div style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#f0f6ec', fontSize: '18px' }}>Symptoms</h3>
            <ul style={{ margin: '0 0 16px 0', paddingLeft: '24px', color: '#8da394', lineHeight: '1.6' }}>
              {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
            </ul>

            <h3 style={{ margin: '0 0 8px 0', color: '#f0f6ec', fontSize: '18px' }}>Causes</h3>
            <ul style={{ margin: '0 0 16px 0', paddingLeft: '24px', color: '#8da394', lineHeight: '1.6' }}>
              {result.causes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>

            <h3 style={{ margin: '0 0 8px 0', color: '#f0f6ec', fontSize: '18px' }}>Recommended Treatments</h3>
            <ul style={{ margin: 0, paddingLeft: '24px', color: '#8da394', lineHeight: '1.6' }}>
              {result.treatments.map((t, i) => <li key={i} style={{ marginBottom: '8px' }}>{t}</li>)}
            </ul>
            <button onClick={() => {setResult(null); setFile(null);}} style={{ marginTop: '32px', width: '100%', padding: '16px', background: '#9eea62', color: '#122015', border: 'none', borderRadius: '24px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Scan Another Plant</button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export function Market() {
  const profile = getMockProfile();
  
  const allCrops = ['Wheat', 'Rice (Basmati)', 'Soybean', 'Cotton', 'Sugarcane', 'Maize', 'Onion', 'Potato'];
  const allMandis = [
    'Azadpur Mandi, Delhi', 'Karnal Market, Haryana', 'Lasalgaon, Maharashtra', 
    'Pune APMC, Maharashtra', 'Indore Mandi, MP', 'Latur, Maharashtra', 
    'Rajkot, Gujarat', 'Akola, Maharashtra', 'Surat Market, Gujarat',
    'Nashik APMC, Maharashtra', 'Ambala Mandi, Haryana', 'Mumbai APMC, Maharashtra'
  ];

  const [selectedCrop, setSelectedCrop] = useState(profile.cropName || 'Wheat');
  const [selectedMandi, setSelectedMandi] = useState('Lasalgaon, Maharashtra');
  const [yieldAcres, setYieldAcres] = useState(profile.land_size || 5);

  const formatRupee = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  // Generate deterministic mock data based on crop and mandi
  const basePrice = (selectedCrop.length * 100) + (selectedMandi.length * 50);
  const currentPrice = basePrice + 1200;
  
  const historicalData = Array.from({length: 30}, (_, i) => ({
    date: `${i + 1} Sep`,
    price: currentPrice - 100 + Math.floor(Math.sin(i/2) * 150) + (i * 5)
  }));
  
  const trend = historicalData[29].price > historicalData[0].price ? 'up' : 'down';
  const highestPriceDay = historicalData.reduce((prev, current) => (prev.price > current.price) ? prev : current);

  const yieldPerAcreQuintals = 15;
  const totalQuintals = yieldAcres * yieldPerAcreQuintals;
  const totalRevenue = totalQuintals * currentPrice;

  return (
    <>
      <FeatureHeader 
        eyebrow="MARKET TRENDS" 
        title="Market Intelligence" 
        text="Track real-time prices across major mandis and predict the best time to sell."
        image="https://images.unsplash.com/photo-1579705745173-43187214e21a?auto=format&fit=crop&w=1200&q=80"
      />
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <OfflineBanner />
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#8da394', fontWeight: 'bold' }}>
            Select Crop
            <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334637', background: '#121b16', color: '#f0f6ec', fontSize: '16px', outline: 'none' }}>
              {allCrops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={{ flex: 2, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#8da394', fontWeight: 'bold' }}>
            Select Marketplace / Mandi
            <select value={selectedMandi} onChange={e => setSelectedMandi(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #334637', background: '#121b16', color: '#f0f6ec', fontSize: '16px', outline: 'none' }}>
              {allMandis.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', background: '#121b16', padding: '24px', borderRadius: '12px', border: '1px solid #29372d' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '28px', color: '#f0f6ec' }}>{selectedCrop}</h2>
            <div style={{ color: '#8da394' }}>{selectedMandi}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f0f6ec' }}>₹{currentPrice} <small style={{fontSize:'14px', color:'#8da394'}}>/ Qtl</small></div>
            <div style={{ color: trend === 'up' ? '#9eea62' : '#e46f6f', fontWeight: 'bold', fontSize: '16px' }}>
              {trend === 'up' ? '▲' : '▼'} {trend === 'up' ? '+4.2%' : '-1.5%'} (30d Trend)
            </div>
          </div>
        </div>

        <div style={{ background: '#121b16', padding: '16px', borderRadius: '12px', border: '1px solid #29372d', marginBottom: '24px', height: '350px' }}>
          <h3 style={{margin: '0 0 16px 0', fontSize: '14px', color: '#8da394', textTransform: 'uppercase'}}>30-Day Price Trend</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#29372d" />
              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#8da394'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#8da394'}} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #29372d', background: '#0b110e', color: '#f0f6ec' }} itemStyle={{ color: '#9eea62' }} />
              <Line type="monotone" dataKey="price" stroke="#9eea62" strokeWidth={3} dot={false} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1c2e22', padding: '24px', borderRadius: '12px', border: '1px solid #9eea62', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontSize: '40px' }}>🤖</div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#9eea62', fontSize: '18px' }}>AI Selling Prediction</h3>
            <p style={{ margin: 0, color: '#f0f6ec', lineHeight: '1.5' }}>
              Based on historical data and current market velocity, the best time to sell <strong>{selectedCrop}</strong> at <strong>{selectedMandi}</strong> is around <strong>{highestPriceDay.date}</strong>. We expect prices to peak near <strong>₹{highestPriceDay.price}</strong>. Consider holding if you have storage capacity.
            </p>
          </div>
        </div>

        <div style={{ background: '#121b16', padding: '24px', borderRadius: '12px', border: '1px solid #29372d', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#f0f6ec', fontSize: '18px' }}>🧮 Revenue Calculator</h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', color: '#8da394', fontSize: '14px', fontWeight: 'bold' }}>
              Farm Area (Acres)
              <input type="number" value={yieldAcres} onChange={e => setYieldAcres(e.target.value)} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #334637', background: '#0b110e', color: '#f0f6ec', fontSize: '16px' }} />
            </label>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', color: '#8da394', fontSize: '14px', justifyContent: 'flex-end', fontWeight: 'bold' }}>
              <div style={{ padding: '16px', background: '#0b110e', borderRadius: '8px', border: '1px solid #334637', color: '#f0f6ec', fontSize: '16px' }}>
                Est. Yield: ~{totalQuintals.toFixed(1)} Quintals
              </div>
            </div>
          </div>
          <div style={{ paddingTop: '24px', borderTop: '1px solid #29372d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#8da394', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px' }}>Estimated Revenue</div>
              <div style={{ color: '#6e8877', fontSize: '12px', marginTop: '4px' }}>(Calculated at ₹{currentPrice}/Qtl)</div>
            </div>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#9eea62' }}>{formatRupee(totalRevenue)}</span>
          </div>
        </div>

      </div>
    </>
  );
}

export function Marketplace() {
  const [tab, setTab] = useState('buy');
  const [wallet, setWallet] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Real data state
  const [listings, setListings] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity: '', image: null });

  useEffect(() => {
    const fetchListings = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('kisan_market_listings') || '[]');
        // Clean up old dummy data forcefully
        const cleaned = stored.filter(item => item.id !== '101');
        if (cleaned.length !== stored.length) {
          localStorage.setItem('kisan_market_listings', JSON.stringify(cleaned));
        }
        setListings(cleaned);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchListings();
    const interval = setInterval(fetchListings, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSell = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.quantity || !newProduct.image) {
      alert("Please fill all fields, including quantity, and upload an image.");
      return;
    }
    
    const currentUser = getStoredUser();
    
    const newItem = {
      id: Date.now().toString(),
      name: newProduct.name,
      price: newProduct.price,
      quantity: newProduct.quantity,
      image: newProduct.image,
      sellerPhone: currentUser ? currentUser.phone : 'unknown'
    };
    
    const updatedListings = [newItem, ...listings];
    setListings(updatedListings);
    localStorage.setItem('kisan_market_listings', JSON.stringify(updatedListings));
    
    setNewProduct({ name: '', price: '', quantity: '', image: null });
    alert(wallet ? "Triggering listProduct() via MetaMask Web3 Provider..." : "Listed successfully via API.");
    setTab('buy');
  };

  const handleBuy = async (product) => {
    const qtyStr = prompt(`How many units of ${product.name} would you like to buy? (Available: ${product.quantity})`, '1');
    if (!qtyStr) return; // User cancelled
    
    const qtyToBuy = parseInt(qtyStr, 10);
    if (isNaN(qtyToBuy) || qtyToBuy <= 0) {
      alert("Invalid quantity.");
      return;
    }
    if (qtyToBuy > parseInt(product.quantity, 10)) {
      alert("Not enough quantity available.");
      return;
    }

    setTxHash('Processing blockchain transaction and IPFS upload... Please wait...');

    try {
      const response = await api('/web3-purchase', {
        method: 'POST',
        body: JSON.stringify({
          productName: product.name,
          quantity: qtyToBuy,
          pricePerUnit: product.price,
          productImage: product.image
        })
      });

      const { txHash: realTx, ipfsLink: realIpfs } = response;

      // Update product quantity
      const updatedListings = listings.map(item => {
        if (item.id === product.id) {
          return { ...item, quantity: (parseInt(item.quantity, 10) - qtyToBuy).toString() };
        }
        return item;
      });
      setListings(updatedListings);
      localStorage.setItem('kisan_market_listings', JSON.stringify(updatedListings));

      const newOrder = {
        id: Date.now().toString().slice(-6),
        name: `${product.name} (x${qtyToBuy})`,
        price: parseInt(product.price, 10) * qtyToBuy,
        ipfsLink: realIpfs,
        date: new Date().toISOString()
      };
      
      const existingOrders = JSON.parse(localStorage.getItem('kisan_orders') || '[]');
      localStorage.setItem('kisan_orders', JSON.stringify([newOrder, ...existingOrders]));

      setTxHash(`0x...${realTx.slice(-4)} (Receipt: ${realIpfs.split('/').pop()})`);
      alert(`Purchase Successful! Your digital receipt has been saved to IPFS: ${realIpfs}. You can view it in the Orders page.`);

    } catch (e) {
      console.error(e);
      setTxHash('');
      alert("Transaction failed: " + e.message);
    }
  };

  return (
    <>
      <FeatureHeader 
        eyebrow="COMMERCE" 
        title="Marketplace" 
        text="Buy inputs and sell your produce directly."
        image="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80"
        action={
          <button onClick={() => setWallet(!wallet)} style={{ background: wallet ? '#9eea62' : '#f59e0b', color: wallet ? '#122015' : '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            🦊 {wallet ? '0x8A...3F1a Connected' : 'Connect Web3 Wallet'}
          </button>
        }
      />
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <OfflineBanner />
        
        {txHash && <div style={{ background: '#1c2e22', color: '#9eea62', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold', fontSize: '13px', border: '1px solid #9eea62' }}>✓ Smart Contract Transaction Success: {txHash}</div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#121b16', padding: '4px', borderRadius: '8px', border: '1px solid #29372d' }}>
          <button type="button" onClick={() => setTab('buy')} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: tab === 'buy' ? '#1c2e22' : 'transparent', color: tab === 'buy' ? '#9eea62' : '#8da394', fontWeight: tab === 'buy' ? 'bold' : 'normal', cursor: 'pointer' }}>🛒 Buy Products</button>
          <button type="button" onClick={() => setTab('sell')} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: tab === 'sell' ? '#1c2e22' : 'transparent', color: tab === 'sell' ? '#9eea62' : '#8da394', fontWeight: tab === 'sell' ? 'bold' : 'normal', cursor: 'pointer' }}>🏷️ My Listings</button>
        </div>

        {tab === 'buy' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {listings.map(item => (
              <div key={item.id} style={{ background: '#121b16', borderRadius: '12px', overflow: 'hidden', border: '1px solid #29372d' }}>
                <div style={{ height: '120px', background: `url(${item.image}) center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!item.image && <span style={{fontSize: '40px'}}>🌱</span>}
                </div>
                <div style={{ padding: '16px' }}>
                  <h4 style={{ margin: '0 0 4px 0', color: '#f0f6ec' }}>{item.name}</h4>
                  <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '12px' }}>Available: {item.quantity} Units</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9eea62', marginBottom: '16px' }}>₹{item.price} <small style={{ color: '#8da394', fontSize: '12px' }}>/ unit</small></div>
                  <button onClick={() => handleBuy(item)} style={{ width: '100%', padding: '10px', background: parseInt(item.quantity, 10) > 0 && item.sellerPhone !== getStoredUser()?.phone ? '#9eea62' : '#334637', color: '#122015', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: parseInt(item.quantity, 10) > 0 && item.sellerPhone !== getStoredUser()?.phone ? 'pointer' : 'not-allowed' }} disabled={parseInt(item.quantity, 10) <= 0 || item.sellerPhone === getStoredUser()?.phone}>
                    {item.sellerPhone === getStoredUser()?.phone ? 'Your Listing' : (parseInt(item.quantity, 10) > 0 ? (wallet ? 'Buy Now (ETH)' : 'Buy Now (Fiat)') : 'Sold Out')}
                  </button>
                </div>
              </div>
            ))}
            {listings.length === 0 && <div style={{ color: '#8da394', gridColumn: '1 / -1', textAlign: 'center', padding: '24px' }}>No products available. Go to 'My Listings' to add one!</div>}
          </div>
        )}

      {tab === 'sell' && (
        <div style={{ background: '#121b16', padding: '24px', borderRadius: '12px', border: '1px solid #29372d' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#f0f6ec' }}>Create Web3 Listing</h3>
          <form onSubmit={handleSell} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: '#8da394' }}>
              Product Image
              <div style={{ background: '#0b110e', border: '1px dashed #334637', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%' }} />
                {newProduct.image && <img src={newProduct.image} alt="Preview" style={{ marginTop: '16px', maxHeight: '120px', borderRadius: '8px', objectFit: 'contain' }} />}
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: '#8da394' }}>
              Product Name
              <input type="text" placeholder="e.g. Organic Tomatoes" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334637', background: '#0b110e', color: '#f0f6ec' }} />
            </label>

            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', flex: 1, color: '#8da394' }}>
                Price (₹/Unit)
                <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334637', background: '#0b110e', color: '#f0f6ec' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', flex: 1, color: '#8da394' }}>
                Quantity Available
                <input type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334637', background: '#0b110e', color: '#f0f6ec' }} />
              </label>
            </div>

            <button type="submit" style={{ background: '#9eea62', color: '#122015', padding: '16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', marginTop: '16px', cursor: 'pointer' }}>Publish to Blockchain</button>
          </form>
        </div>
      )}
      </div>
    </>
  );
}

export function Chatbot() {
  const profile = getMockProfile();
  const [messages, setMessages] = useState([
    { role: 'system', text: `System Context: Farmer in ${profile.state || 'India'} | ${profile.land_size || 5} acres | ${profile.soil || 'Loamy'} soil | Crop: ${profile.cropName || 'Wheat'}` },
    { role: 'assistant', text: 'Hello! I am your Kisan AI Assistant. You can type or use the microphone to speak to me.' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;
  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
  }

  const toggleListen = () => {
    if (!recognition) return alert('Speech Recognition not supported in this browser.');
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };
      recognition.onerror = () => {
        setListening(false);
      };
      recognition.onend = () => {
        setListening(false);
      };
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detect Hindi characters to switch language
    const hasHindi = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const send = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    
    setMessages([...messages, { role: 'user', text: input }]);
    const currentInput = input;
    setInput('');
    
    setTimeout(() => {
      let reply = `Considering your ${profile.land_size || 5} acres of ${profile.cropName || 'Wheat'} in ${profile.state || 'your region'}, I recommend focusing on timing your irrigation carefully this week due to predicted weather. Also, keep an eye on the Mandi prices.`;
      
      const lowerInput = currentInput.toLowerCase();
      if (lowerInput.includes('kide') || lowerInput.includes('keede') || lowerInput.includes('bug') || lowerInput.includes('pest')) {
        reply = `नमस्ते! आपके ${profile.cropName || 'फसल'} में कीड़ों (pests) की समस्या के लिए, मैं आपको 'Neem Oil' (नीम का तेल) का स्प्रे करने की सलाह देता हूँ, जो प्राकृतिक और सुरक्षित है। यदि संक्रमण बहुत ज्यादा है, तो कृपया क्लोरपायरीफोस (Chlorpyrifos) का उपयोग निर्देशों के अनुसार करें।`;
      } else if (lowerInput.includes('sukh') || lowerInput.includes('dry') || lowerInput.includes('sukha')) {
        reply = `यदि आपका खेत सूख रहा है, तो कृपया तुरंत सिंचाई (irrigation) का प्रबंध करें। मिट्टी में नमी बनाए रखने के लिए मल्चिंग (mulching) का उपयोग करें और मौसम विभाग के पूर्वानुमान के अनुसार पानी दें।`;
      } else if (lowerInput.includes('weather') || lowerInput.includes('mausam')) {
        reply = `आपके क्षेत्र (${profile.district || profile.state}) में इस सप्ताह बारिश की संभावना है। कृपया कटाई को कुछ दिनों के लिए टाल दें।`;
      }

      setMessages(m => [...m, { role: 'assistant', text: reply }]);
      speakText(reply);
    }, 1500);
  };

  return (
    <>
      <FeatureHeader 
        eyebrow="AI EXPERT" 
        title="Kisan Assistant" 
        text="Text-to-text, voice-to-text, and voice-to-voice interactive guidance." 
        image="https://images.unsplash.com/photo-1530836369250-ef71a3f5e43d?auto=format&fit=crop&w=1200&q=80"
      />
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '65vh', padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#1a281d', padding: '16px 24px', color: '#f0f6ec', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #29372d' }}>
          <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: speaking ? '#9eea62' : '#4e9c57', marginRight: '8px', animation: speaking ? 'spin 1s infinite alternate' : 'none' }}></div>
            ✦
          </span> 
          <span>Agri Assistant {speaking && <small style={{ color: '#9eea62', fontSize: '12px', marginLeft: '8px' }}>(Speaking...)</small>}</span>
        </div>
        
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#0b110e' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : (m.role === 'system' ? 'center' : 'flex-start'), maxWidth: m.role === 'system' ? '100%' : '75%' }}>
              <div style={{ background: m.role === 'user' ? '#9eea62' : (m.role === 'system' ? 'rgba(0,0,0,0.2)' : '#121b16'), color: m.role === 'user' ? '#122015' : (m.role === 'system' ? '#6e8877' : '#f0f6ec'), padding: m.role === 'system' ? '8px 16px' : '12px 18px', borderRadius: '16px', borderBottomRightRadius: m.role === 'user' ? 0 : '16px', borderBottomLeftRadius: m.role === 'assistant' ? 0 : '16px', border: m.role === 'assistant' ? '1px solid #29372d' : 'none', fontSize: m.role === 'system' ? '11px' : '15px', lineHeight: '1.5', fontFamily: m.role === 'system' ? "'DM Mono', monospace" : 'inherit' }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={send} style={{ padding: '20px', background: '#121b16', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #29372d' }}>
          <button type="button" onClick={toggleListen} style={{ background: listening ? '#e46f6f' : '#1c2e22', color: listening ? '#fff' : '#9eea62', border: '1px solid', borderColor: listening ? '#e46f6f' : '#334637', fontSize: '20px', cursor: 'pointer', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
            {listening ? '⏹' : '🎤'}
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={listening ? "Listening..." : "Type or speak your message..."} style={{ flex: 1, padding: '14px 20px', borderRadius: '24px', border: '1px solid #334637', background: '#0b110e', color: '#f0f6ec', fontSize: '15px', outline: 'none' }} />
          <button type="submit" disabled={!input.trim()} style={{ background: input.trim() ? '#9eea62' : '#334637', color: input.trim() ? '#122015' : '#8da394', border: 'none', borderRadius: '50%', width: '48px', height: '48px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: '0.2s' }}>➤</button>
        </form>
      </div>
    </>
  );
}

export function Schemes() {
  const profile = getMockProfile();
  const schemesList = [
    { name: 'PM-Kisan Samman Nidhi', subsidy: '₹6,000 per year', req: 'Small and marginal farmers (< 5 acres)', minLand: 0, maxLand: 5, link: 'https://pmkisan.gov.in/' },
    { name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', subsidy: 'Premium Subsidy up to 90%', req: 'All farmers growing notified crops', minLand: 0, maxLand: 100, link: 'https://pmfby.gov.in/' },
    { name: 'Paramparagat Krishi Vikas Yojana', subsidy: '₹50,000 per ha / 3 years', req: 'Organic farming clusters', minLand: 0, maxLand: 100, link: 'https://pgsindia-ncof.gov.in/pkvy/' },
    { name: 'Large Scale Tech Fund', subsidy: '₹2,00,000 grant', req: 'Large commercial farms (> 10 acres)', minLand: 10, maxLand: 1000, link: 'https://agricoop.nic.in/' },
    { name: 'PM KUSUM Scheme', subsidy: 'Up to 60% on Solar Pumps', req: 'Farmers needing irrigation power', minLand: 2, maxLand: 100, link: 'https://mnre.gov.in/' },
    { name: 'Agriculture Infrastructure Fund', subsidy: '3% Interest Subvention', req: 'For post-harvest management', minLand: 0, maxLand: 1000, link: 'https://agriinfra.dac.gov.in/' },
    { name: 'Rashtriya Krishi Vikas Yojana', subsidy: 'Variable Project Grants', req: 'State specific agricultural projects', minLand: 0, maxLand: 1000, link: 'https://rkvy.nic.in/' },
    { name: 'National Mission on Edible Oils', subsidy: 'Seed and machinery subsidies', req: 'Farmers growing Oil palm', minLand: 1, maxLand: 50, link: 'https://nmoop.gov.in/' },
    { name: 'Soil Health Card Scheme', subsidy: 'Free Soil Testing', req: 'All farmers across India', minLand: 0, maxLand: 1000, link: 'https://soilhealth.dac.gov.in/' },
    { name: 'Sub-Mission on Agricultural Mechanization', subsidy: '40%-80% on Tractors/Drones', req: 'FPOs, SHGs, and individuals', minLand: 5, maxLand: 100, link: 'https://farmech.dac.gov.in/' },
    { name: 'Kisan Credit Card (KCC)', subsidy: 'Low-interest credit', req: 'Farmers, Tenant farmers, Sharecroppers', minLand: 0, maxLand: 1000, link: 'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-loan/kisan-credit-card' },
    { name: 'National Agriculture Market (eNAM)', subsidy: 'Free Market Access', req: 'All Farmers looking to sell produce', minLand: 0, maxLand: 1000, link: 'https://www.enam.gov.in/' },
    { name: 'Grama Bhandaran Yojana', subsidy: '25% - 33.33% Subsidy for Godowns', req: 'Farmers building storage facilities', minLand: 2, maxLand: 1000, link: 'https://www.nabard.org/' },
    { name: 'National Mission for Sustainable Agriculture', subsidy: 'Grants for water conservation', req: 'Farms prone to drought', minLand: 0, maxLand: 100, link: 'https://nmsa.dac.gov.in/' },
    { name: 'PM Krishi Sinchayee Yojana', subsidy: 'Subsidies on Drip & Sprinklers', req: 'Farmers seeking water efficiency', minLand: 0, maxLand: 100, link: 'https://pmksy.gov.in/' },
    { name: 'Mission for Integrated Development of Horticulture', subsidy: 'Subsidies for Fruits/Vegetables', req: 'Horticulture Farmers', minLand: 0, maxLand: 100, link: 'https://midh.gov.in/' },
    { name: 'National Food Security Mission', subsidy: 'Assistance for Pulses/Wheat', req: 'Farmers growing target crops', minLand: 0, maxLand: 100, link: 'https://nfsm.gov.in/' },
    { name: 'Venture Capital Assistance Scheme', subsidy: 'Interest-free loans', req: 'Agripreneurs and FPOs', minLand: 5, maxLand: 1000, link: 'http://sfacindia.com/' },
    { name: 'Deendayal Antyodaya Yojana', subsidy: 'Livelihood grants', req: 'Rural poor and marginal farmers', minLand: 0, maxLand: 2, link: 'https://aajeevika.gov.in/' },
    { name: 'Atmanirbhar Bharat Abhiyan (Agri)', subsidy: 'Agri-Infrastructure Loans', req: 'Post-harvest infrastructure', minLand: 5, maxLand: 1000, link: 'https://agricoop.nic.in/' }
  ];

  const filtered = schemesList.filter(s => profile.land_size >= s.minLand && profile.land_size <= s.maxLand);

  return (
    <>
      <FeatureHeader 
        eyebrow="GOVERNMENT SCHEMES" 
        title="Available Schemes" 
        text={`Auto-filtered for ${profile.land_size || 5} acres in ${profile.state || 'your region'}`}
        image="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=1200&q=80"
      />
      
      <div className="scheme-grid">
        {filtered.map((s, i) => (
          <div key={i} className="scheme-card card">
            <div className="scheme-tag">{s.subsidy}</div>
            <h3 style={{ color: '#f0f6ec' }}>{s.name}</h3>
            <p><strong>Eligibility:</strong> {s.req}</p>
            <a href={s.link} target="_blank" rel="noreferrer" className="primary" style={{ display: 'block', textAlign: 'center', marginTop: '16px', textDecoration: 'none' }}>Apply Now ↗</a>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty">No schemes found for your exact criteria.</div>}
      </div>
    </>
  );
}

export function Reports() {
  const profile = getMockProfile();
  const [report, setReport] = useState(null);
  
  useEffect(() => {
    const acres = parseFloat(profile.land_size) || 1;
    const formatRupee = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

    const baseCost = 24000; // per acre
    const baseRev = 70000;  // per acre
    
    const cropCost = baseCost * acres;
    const expectedRev = baseRev * acres;
    const net = expectedRev - cropCost;

    setReport({
      title: "Annual Farm Strategy & Financial Plan",
      year: "2026-2027",
      crop: `${profile.cropName || 'Wheat'} & Crop Rotation`,
      soilNote: `Tailored for your soil and ${profile.water_source || 'your'} irrigation. scaled precisely for ${acres} acres.`,
      summary: { totalCost: formatRupee(cropCost), expectedRevenue: formatRupee(expectedRev), netProfit: formatRupee(net), roi: "191%" },
      monthlyPlan: [
        { month: "January", activity: "Winter Irrigation & Weeding", cost: formatRupee(1200 * acres) },
        { month: "February", activity: "Pesticide Spray & Maintenance", cost: formatRupee(1600 * acres) },
        { month: "March", activity: `${profile.cropName || 'Wheat'} Harvesting Preparation`, cost: formatRupee(1000 * acres) },
        { month: "April", activity: `${profile.cropName || 'Wheat'} Harvesting & Sale`, cost: formatRupee(6000 * acres), revenue: formatRupee(40000 * acres) },
        { month: "May", activity: "Field Plowing & Sun-drying Soil", cost: formatRupee(2500 * acres) },
        { month: "June", activity: "Secondary Crop Sowing (e.g. Soyabean)", cost: formatRupee(3600 * acres) },
        { month: "July", activity: "Monsoon Fertilizer Application", cost: formatRupee(2200 * acres) },
        { month: "August", activity: "Pest Management & Growth Monitoring", cost: formatRupee(1500 * acres) },
        { month: "September", activity: "Secondary Crop Harvesting", cost: formatRupee(5400 * acres), revenue: formatRupee(30000 * acres) },
        { month: "October", activity: `Land Preparation & Basal Fertilizer for ${profile.cropName || 'Wheat'}`, cost: formatRupee(3000 * acres) },
        { month: "November", activity: `${profile.cropName || 'Wheat'} Sowing & First Irrigation`, cost: formatRupee(4400 * acres) },
        { month: "December", activity: "Frost Protection & Micronutrient Spray", cost: formatRupee(1800 * acres) }
      ]
    });
  }, []);

  if (!report) return null;

  return (
    <>
      <FeatureHeader 
        eyebrow="FARM INTELLIGENCE" 
        title="Farm Report" 
        text={`Your detailed per annum generated plan for ${profile.land_size || 5} acres in ${profile.state || 'your region'}.`}
        image="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
      />
      
      <div className="card report-intro">
        <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#f0f6ec' }}>{report.title} ({report.year})</h3>
        <div style={{ color: '#9eea62', fontSize: '14px', marginBottom: '20px' }}>Strategy: {report.crop}</div>
        <p style={{ color: '#8da394', fontSize: '13px' }}>{report.soilNote}</p>
        
        <h4 style={{ margin: '24px 0 16px 0', fontSize: '14px', borderBottom: '1px solid #29372d', paddingBottom: '8px', color: '#6e8877', letterSpacing: '0.1em' }}>FINANCIAL OVERVIEW</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: '#1c1717', padding: '16px', borderRadius: '8px', border: '1px solid #332222' }}>
            <div style={{ fontSize: '12px', color: '#e46f6f', fontWeight: 'bold', textTransform: 'uppercase' }}>Estimated Costs</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0f6ec', marginTop: '4px' }}>{report.summary.totalCost}</div>
          </div>
          <div style={{ background: '#17221b', padding: '16px', borderRadius: '8px', border: '1px solid #233528' }}>
            <div style={{ fontSize: '12px', color: '#9eea62', fontWeight: 'bold', textTransform: 'uppercase' }}>Expected Profit</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0f6ec', marginTop: '4px' }}>{report.summary.netProfit}</div>
          </div>
        </div>

        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', borderBottom: '1px solid #29372d', paddingBottom: '8px', color: '#6e8877', letterSpacing: '0.1em' }}>DETAILED MONTHLY PLAN</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report.monthlyPlan.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', background: '#121b16', borderRadius: '8px', borderLeft: '3px solid #9eea62' }}>
              <div style={{ width: '80px', fontWeight: 'bold', color: '#a5b7a6', fontSize: '13px' }}>{m.month}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f0f6ec', marginBottom: '8px', fontSize: '15px' }}>{m.activity}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: '#e46f6f' }}>Cost: {m.cost}</span>
                  {m.revenue && <span style={{ color: '#9eea62', fontWeight: 'bold' }}>Revenue: {m.revenue}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
