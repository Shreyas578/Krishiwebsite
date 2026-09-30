import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setSession } from './api';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import * as turf from '@turf/turf';

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function FarmBoundaryMap({ onBoundaryChange, center = [20.5937, 78.9629], zoom = 5 }) {
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
    <div style={{ position: 'relative', height: '400px', width: '100%', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1a2235' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', zIndex: 1, paddingBottom: '120px' }}>
        <ChangeView center={center} zoom={zoom} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents />
        {points.map((p, i) => <Marker key={i} position={p} />)}
        {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.4 }} />}
      </MapContainer>
      
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: '#0f172a', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: '#f8fafc', padding: '8px', borderRadius: '8px', color: '#0f172a', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Area</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>{metrics.area} ha</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button type="button" style={{ background: '#ef4444', color: 'white', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} onClick={clearMap}>🗑</button>
          <button type="button" style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold', border: 'none', flex: 1, cursor: 'pointer' }} onClick={submitMap}>Confirm Boundary</button>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const [data, setData] = useState({
    role: 'farmer', name: '', phone: '', email: '', language: 'English', password: '',
    locationMethod: 'gps', village: '', tehsil: '', district: '', state: '', pincode: '', lat: '', lng: '', boundaryPoints: [],
    land_size: '', plots: 1, soil_type: '🟠 Loamy (Mixed)', water_source: '🔩 Borewell/Tubewell', irrigation: '💧 Drip Irrigation', topography: 'Plain/Flat', equipment: '', storage: false, budget: '💰💰 Medium (₹50K - 2L)', market: 'Local Market', risk: 'Medium (Balanced)',
    cropMode: 'known', cropName: '', seedVariety: '', sowingDate: '', previousCrop: '', estimatedBudget: '', selectedAiCrop: ''
  });

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
  const languages = ["English (🇬🇧)", "हिंदी (🇮🇳)", "मराठी (🇮🇳)", "ગુજરાતી (🇮🇳)", "தமிழ் (🇮🇳)", "తెలుగు (🇮🇳)"];
  const soils = ["🌾 Clayey", "🟡 Sandy", "🟠 Loamy (Mixed)", "🔴 Red Soil", "⚫ Black Soil", "🟤 Laterite"];
  const waters = ["⛓️ Open Well", "🔩 Borewell/Tubewell", "🌊 Canal/River", "💧 Tank/Pond", "🌧️ Rainwater Harvesting"];
  const irrigations = ["💧 Drip Irrigation", "🌧️ Sprinkler", "🌊 Flood/Basin", "↔️ Furrow", "🌾 Rain-fed"];
  const topographies = ["Plain/Flat", "Sloping", "Undulating", "Hilly"];
  const popularCrops = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Pulses", "Vegetables", "Fruits", "Spices", "Oil Seeds"];

  const generateAiCrops = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiSuggestions([
        { name: 'Soybean', emoji: '🌱', score: '95%', reason: `Perfect match for ${data.soil_type} and ${data.water_source}.` },
        { name: 'Cotton', emoji: '🌿', score: '88%', reason: `Good returns, fits your ${data.budget} budget.` },
        { name: 'Pomegranate', emoji: '🍎', score: '82%', reason: `High value crop suited for ${data.irrigation}.` }
      ]);
      setAiLoading(false);
    }, 2000);
  };

  const submitFinal = async () => {
    setBusy(true);
    setError('');
    try {
      // 1. Register User (This will likely just take the core fields)
      const regRes = await api('/auth/register', { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: data.name, phone: data.phone, password: data.password, role: data.role, email: data.email 
        }) 
      });
      setSession(regRes);
      const userId = regRes?.user?.id || (JSON.parse(localStorage.getItem('kisan_user')||'{}')).id;

      // 2. Try to save Farm Profile Data with the rest of the payload
      localStorage.setItem('kisan_farm_profile', JSON.stringify(data));
      if (userId) {
        await api(`/farm-profile/${userId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).catch(e => console.warn('Could not save extended profile yet:', e));
      }

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stepImages = [
    '/bg-auth.jpg',
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80', // 1: Farmer portrait
    'https://images.unsplash.com/photo-1586771107445-d3af07311756?auto=format&fit=crop&w=800&q=80', // 2: Drone/Location
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80', // 3: Soil/Tractor
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80', // 4: Seedlings
    'https://images.unsplash.com/photo-1605000794699-6660659dcb59?auto=format&fit=crop&w=800&q=80', // 5: Review/Harvest
  ];
  const bgImage = stepImages[step] || stepImages[1];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b110e', color: '#e8f2eb', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ flex: 1, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px', transition: 'background-image 0.5s ease-in-out' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(11, 17, 14, 0.9), rgba(11, 17, 14, 0.1))' }} />
         <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: '56px', margin: '0 0 16px 0', color: '#fff', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.04em' }}>Cultivate the future.</h1>
            <p style={{ fontSize: '18px', color: '#a5b7a6', maxWidth: '400px', lineHeight: '1.6' }}>Join Kisan AI to unlock precision agriculture, satellite insights, and fair market intelligence directly from your field.</p>
         </div>
      </div>

      <div style={{ flex: 1, padding: '60px 80px', overflowY: 'auto', background: '#0b110e', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '500px', width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', fontSize: '14px', color: '#6e8877', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <span>Step {step} of 5</span>
            <Link to="/login" style={{ color: '#9eea62', textDecoration: 'none' }}>Cancel</Link>
          </div>
      
      {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {step === 1 && (
        <div className="step-content">
          <h2 style={{ fontSize: '32px', fontFamily: "'Space Grotesk', sans-serif", margin: '0 0 10px 0', color: '#f0f6ec' }}>Tell us about yourself</h2>
          <p style={{ color: '#8da394', marginBottom: '32px', fontSize: '15px' }}>We'll use this information to personalize your experience</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: '#121b16', padding: '6px', borderRadius: '10px', border: '1px solid #1a271f' }}>
            {['farmer', 'buyer', 'seller'].map(r => (
              <button key={r} type="button" onClick={() => update('role', r)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', background: data.role === r ? '#9eea62' : 'transparent', color: data.role === r ? '#122015' : '#8da394', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize', transition: '0.2s' }}>{r}</button>
            ))}
          </div>

          <label className="field"><span>Full Name</span><input type="text" value={data.name} onChange={e=>update('name', e.target.value)} required /></label>
          <label className="field"><span>Phone Number</span><input type="number" placeholder="+91 98765 43210" value={data.phone} onChange={e=>update('phone', e.target.value)} required /></label>
          <label className="field"><span>Email Address</span><input type="email" value={data.email} onChange={e=>update('email', e.target.value)} /></label>
          
          <span style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px', display: 'block', color: '#a5b7a6' }}>Preferred Language</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
            {languages.map(l => (
              <span key={l} onClick={()=>update('language', l)} style={{ padding: '10px 18px', background: data.language === l ? '#9eea62' : '#121d15', border: '1px solid', borderColor: data.language === l ? '#9eea62' : '#334637', color: data.language === l ? '#122015' : '#e8f2eb', borderRadius: '24px', fontSize: '13px', cursor: 'pointer', fontWeight: data.language === l ? 'bold' : 'normal', transition: '0.2s' }}>{l}</span>
            ))}
          </div>

          <label className="field"><span>Password</span><input type="password" placeholder="Min 6 chars" value={data.password} onChange={e=>update('password', e.target.value)} required /></label>
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <h2 style={{ fontSize: '32px', fontFamily: "'Space Grotesk', sans-serif", margin: '0 0 10px 0', color: '#f0f6ec' }}>Where is your farm located?</h2>
          <p style={{ color: '#8da394', marginBottom: '24px', fontSize: '15px' }}>Choose GPS or enter manually</p>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="radio" checked={data.locationMethod === 'gps'} onChange={() => update('locationMethod', 'gps')} /> 📍 GPS Map (Auto-detect)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="radio" checked={data.locationMethod === 'manual'} onChange={() => update('locationMethod', 'manual')} /> 📝 Manual</label>
          </div>

          <button type="button" onClick={() => {
             setBusy(true);
             if (navigator.geolocation) {
               navigator.geolocation.getCurrentPosition((pos) => {
                 const lat = pos.coords.latitude;
                 const lng = pos.coords.longitude;
                 update('lat', lat);
                 update('lng', lng);
                 
                 fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                   .then(res => res.json())
                   .then(data => {
                     if (data && data.address) {
                       const addr = data.address;
                       update('state', addr.state || '');
                       update('district', addr.state_district || addr.county || addr.city || '');
                       update('pincode', addr.postcode || '');
                       update('village', addr.village || addr.suburb || '');
                       update('tehsil', addr.county || addr.city_district || '');
                     }
                   })
                   .finally(() => setBusy(false));
               }, () => setBusy(false));
             }
          }} style={{ display: 'block', width: '100%', padding: '12px', background: '#1d2a21', color: '#9eea62', border: '1px solid #9eea62', borderRadius: '6px', fontWeight: 'bold', marginBottom: '16px', cursor: 'pointer' }}>{busy ? '📍 Fetching GPS Data...' : '📍 Get Live Location & Autofill'}</button>

          {data.locationMethod === 'gps' ? (
             <FarmBoundaryMap center={data.lat ? [data.lat, data.lng] : [20.5937, 78.9629]} zoom={data.lat ? 14 : 5} onBoundaryChange={(acres, pts) => { update('land_size', acres); update('boundaryPoints', pts); }} />
          ) : (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <label className="field" style={{ flex: 1 }}><span>Latitude</span><input type="number" value={data.lat} onChange={e=>update('lat', e.target.value)} /></label>
              <label className="field" style={{ flex: 1 }}><span>Longitude</span><input type="number" value={data.lng} onChange={e=>update('lng', e.target.value)} /></label>
            </div>
          )}

          <label className="field"><span>Village (Optional)</span><input type="text" value={data.village} onChange={e=>update('village', e.target.value)} /></label>
          <label className="field"><span>Tehsil/Taluka (Optional)</span><input type="text" value={data.tehsil} onChange={e=>update('tehsil', e.target.value)} /></label>
          <label className="field"><span>District</span><input type="text" value={data.district} onChange={e=>update('district', e.target.value)} required /></label>
          <label className="field"><span>State</span>
            <select value={data.state} onChange={e=>update('state', e.target.value)} required>
              <option value="">Select State...</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field"><span>PIN Code</span><input type="number" value={data.pincode} onChange={e=>update('pincode', e.target.value)} /></label>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h2>Tell us about your land</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>This helps us give better recommendations</p>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <label className="field" style={{ flex: 1 }}><span>Land Size (Acres)</span><input type="number" value={data.land_size} onChange={e=>update('land_size', e.target.value)} required /></label>
            <label className="field" style={{ flex: 1 }}><span>Number of Plots</span><input type="number" value={data.plots} onChange={e=>update('plots', e.target.value)} /></label>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Soil Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {soils.map(s => <span key={s} onClick={()=>update('soil_type', s)} style={{ padding: '8px 16px', background: data.soil_type === s ? '#10b981' : '#f1f5f9', color: data.soil_type === s ? '#fff' : '#333', borderRadius: '20px', fontSize: '14px', cursor: 'pointer' }}>{s}</span>)}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Water Source</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {waters.map(s => <span key={s} onClick={()=>update('water_source', s)} style={{ padding: '8px 16px', background: data.water_source === s ? '#10b981' : '#f1f5f9', color: data.water_source === s ? '#fff' : '#333', borderRadius: '20px', fontSize: '14px', cursor: 'pointer' }}>{s}</span>)}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Irrigation Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {irrigations.map(s => <span key={s} onClick={()=>update('irrigation', s)} style={{ padding: '8px 16px', background: data.irrigation === s ? '#10b981' : '#f1f5f9', color: data.irrigation === s ? '#fff' : '#333', borderRadius: '20px', fontSize: '14px', cursor: 'pointer' }}>{s}</span>)}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Topography</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topographies.map(s => <span key={s} onClick={()=>update('topography', s)} style={{ padding: '8px 16px', background: data.topography === s ? '#10b981' : '#f1f5f9', color: data.topography === s ? '#fff' : '#333', borderRadius: '20px', fontSize: '14px', cursor: 'pointer' }}>{s}</span>)}
            </div>
          </div>

          <label className="field"><span>Equipment Available</span><textarea rows="2" placeholder="E.g., Tractor, Pump, Harrow" value={data.equipment} onChange={e=>update('equipment', e.target.value)} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '500' }}><input type="checkbox" checked={data.storage} onChange={e=>update('storage', e.target.checked)} /> Do you have a storage facility for grains/produce?</label>

          <label className="field"><span>Expected Budget Range</span>
            <select value={data.budget} onChange={e=>update('budget', e.target.value)}>
              <option>💰 Low (&lt; ₹50,000)</option><option>💰💰 Medium (₹50K - 2L)</option><option>💰💰💰 High (&gt; ₹2,00,000)</option>
            </select>
          </label>
          <label className="field"><span>Market Preference</span>
            <select value={data.market} onChange={e=>update('market', e.target.value)}>
              <option>Local Market</option><option>Wholesale</option><option>Export Quality</option>
            </select>
          </label>
          <label className="field"><span>Risk Appetite</span>
            <select value={data.risk} onChange={e=>update('risk', e.target.value)}>
              <option>Low (Traditional crops)</option><option>Medium (Balanced)</option><option>High (High-value crops)</option>
            </select>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="step-content">
          <h2>Do you have a specific crop in mind?</h2>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '16px' }}>
            <button type="button" onClick={()=>update('cropMode', 'known')} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: data.cropMode === 'known' ? '2px solid #9eea62' : '1px solid #334637', background: data.cropMode === 'known' ? '#122015' : '#121b16', color: data.cropMode === 'known' ? '#9eea62' : '#f0f6ec', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>✅ I Have a Crop</button>
            <button type="button" onClick={()=>update('cropMode', 'ai')} style={{ flex: 1, padding: '16px', borderRadius: '8px', border: data.cropMode === 'ai' ? '2px solid #9eea62' : '1px solid #334637', background: data.cropMode === 'ai' ? '#122015' : '#121b16', color: data.cropMode === 'ai' ? '#9eea62' : '#f0f6ec', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>🤔 Undecided</button>
          </div>

          {data.cropMode === 'known' ? (
            <>
              <label className="field"><span>Crop Name</span><input type="text" value={data.cropName} onChange={e=>update('cropName', e.target.value)} /></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {popularCrops.map(c => <span key={c} onClick={()=>update('cropName', c)} style={{ padding: '6px 12px', background: '#1c2e22', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: '1px solid #29372d' }}>{c}</span>)}
              </div>
              <label className="field"><span>Seed Variety (Optional)</span><input type="text" placeholder="e.g., HD2967" value={data.seedVariety} onChange={e=>update('seedVariety', e.target.value)} /></label>
              <label className="field"><span>Estimated Sowing Date</span><input type="date" value={data.sowingDate} onChange={e=>update('sowingDate', e.target.value)} /></label>
              <label className="field"><span>Previous Crop</span><input type="text" value={data.previousCrop} onChange={e=>update('previousCrop', e.target.value)} /></label>
            </>
          ) : (
            <div style={{ background: '#121b16', padding: '24px', borderRadius: '12px', border: '1px solid #334637', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#f0f6ec' }}>✨ AI Crop Intelligence</h3>
              <p style={{ color: '#8da394', fontSize: '14px', marginBottom: '24px' }}>We will analyze your soil ({data.soil_type}), water source, and budget to recommend the perfect crop.</p>
              <label className="field" style={{ textAlign: 'left' }}><span>Estimated Budget (₹)</span><input type="number" value={data.estimatedBudget} onChange={e=>update('estimatedBudget', e.target.value)} /></label>
              <button type="button" onClick={generateAiCrops} style={{ background: '#9eea62', color: '#122015', border: 'none', padding: '12px 24px', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '16px' }}>{aiLoading ? 'Analyzing Data...' : 'Get AI Crop Suggestions'}</button>
              
              {aiSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  {aiSuggestions.map((s, i) => (
                    <div key={i} onClick={()=>update('selectedAiCrop', s.name)} style={{ padding: '16px', border: data.selectedAiCrop === s.name ? '2px solid #9eea62' : '1px solid #334637', borderRadius: '8px', background: '#1c2e22', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f0f6ec' }}>{s.emoji} {s.name}</span>
                        <span style={{ background: '#122015', color: '#9eea62', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #9eea62' }}>{s.score} Match</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#a5b7a6' }}>{s.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="step-content">
          <h2>Review & Submit</h2>
          <p style={{ color: '#8da394', marginBottom: '24px' }}>Please check your details before creating your account.</p>
          
          <div style={{ background: '#121b16', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', border: '1px solid #29372d' }}>
            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #29372d', paddingBottom: '8px', color: '#9eea62' }}>Personal</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Name:</span> <b style={{color: '#f0f6ec'}}>{data.name}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Role:</span> <b style={{textTransform:'capitalize', color: '#f0f6ec'}}>{data.role}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><span className="muted">Phone:</span> <b style={{color: '#f0f6ec'}}>{data.phone}</b></div>

            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #29372d', paddingBottom: '8px', color: '#9eea62' }}>Farm & Land</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Location:</span> <b style={{color: '#f0f6ec'}}>{data.district}, {data.state}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Size:</span> <b style={{color: '#f0f6ec'}}>{data.land_size} Acres</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Soil:</span> <b style={{color: '#f0f6ec'}}>{data.soil_type}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><span className="muted">Water:</span> <b style={{color: '#f0f6ec'}}>{data.water_source}</b></div>

            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #29372d', paddingBottom: '8px', color: '#9eea62' }}>Crop Strategy</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Target Crop:</span> <b style={{color: '#f0f6ec'}}>{data.cropMode === 'known' ? data.cropName : data.selectedAiCrop}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span className="muted">Market:</span> <b style={{color: '#f0f6ec'}}>{data.market}</b></div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
        {step > 1 ? (
          <button type="button" onClick={() => setStep(s => s - 1)} style={{ padding: '12px 24px', background: '#f1f5f9', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}>← Back</button>
        ) : <div />}
        
        {step < 5 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} style={{ padding: '12px 24px', background: '#9eea62', color: '#16311c', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}>Next Step →</button>
        ) : (
          <button type="button" onClick={submitFinal} disabled={busy} style={{ padding: '12px 32px', background: '#9eea62', color: '#16311c', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>{busy ? 'Registering...' : 'Submit Registration ✓'}</button>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
