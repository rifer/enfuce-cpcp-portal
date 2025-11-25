import React, { useState } from 'react';

const EnfucePortal = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [newProgram, setNewProgram] = useState({
    name: '',
    type: '',
    fundingModel: '',
    formFactor: [],
    scheme: '',
    currency: 'EUR',
    dailyLimit: 500,
    monthlyLimit: 5000,
    mccRestrictions: [],
    countries: []
  });

  const cardPrograms = [
    { id: 1, name: 'UN Delegate Prepaid', type: 'Prepaid', status: 'Active', cards: 2847, spend: '€1.2M', scheme: 'Visa' },
    { id: 2, name: 'Manager Debit', type: 'Debit', status: 'Active', cards: 156, spend: '€458K', scheme: 'Mastercard' },
    { id: 3, name: 'Executive Credit', type: 'Credit', status: 'Active', cards: 42, spend: '€892K', scheme: 'Visa' },
    { id: 4, name: 'Fleet Fuel Card', type: 'Fleet', status: 'Draft', cards: 0, spend: '€0', scheme: 'Visa' },
    { id: 5, name: 'Employee Meal Card', type: 'Prepaid', status: 'Active', cards: 1203, spend: '€234K', scheme: 'Mastercard' }
  ];

  const mccCategories = [
    { code: '5812', name: 'Restaurants', icon: '🍽️' },
    { code: '5814', name: 'Fast Food', icon: '🍔' },
    { code: '5541', name: 'Gas Stations', icon: '⛽' },
    { code: '4111', name: 'Public Transit', icon: '🚇' },
    { code: '4121', name: 'Taxi/Rideshare', icon: '🚕' },
    { code: '5411', name: 'Grocery Stores', icon: '🛒' },
    { code: '5311', name: 'Department Stores', icon: '🏬' },
    { code: '7011', name: 'Hotels', icon: '🏨' },
    { code: '3000', name: 'Airlines', icon: '✈️' },
    { code: '5732', name: 'Electronics', icon: '💻' }
  ];

  const StatusBadge = ({ status }) => {
    const colors = {
      'Active': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Draft': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Suspended': 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const SideNav = () => (
    <div className="w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <div className="text-white font-semibold">MyEnfuce</div>
            <div className="text-slate-400 text-xs">Card Configuration</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {[
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'programs', icon: '💳', label: 'Card Programs' },
          { id: 'cardholders', icon: '👥', label: 'Cardholders' },
          { id: 'transactions', icon: '📈', label: 'Transactions' },
          { id: 'controls', icon: '🔒', label: 'Spend Controls' },
          { id: 'compliance', icon: '✅', label: 'Compliance' },
          { id: 'api', icon: '⚡', label: 'API & Webhooks' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
              activeSection === item.id 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="text-xs text-slate-400 mb-1">Organization</div>
          <div className="text-white font-medium">United Nations</div>
          <div className="text-xs text-slate-500 mt-1">Enterprise Plan</div>
        </div>
      </div>
    </div>
  );

  const StatsCard = ({ icon, label, value, change, color }) => (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {change && (
          <span className={`text-xs px-2 py-0.5 rounded ${change > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );

  const WizardStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['Basics', 'Card Config', 'Spend Controls', 'Design', 'Review'].map((step, idx) => (
        <div key={idx} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
            wizardStep > idx + 1 ? 'bg-emerald-500 text-white' :
            wizardStep === idx + 1 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            {wizardStep > idx + 1 ? '✓' : idx + 1}
          </div>
          <div className={`ml-2 text-sm hidden sm:block ${wizardStep === idx + 1 ? 'text-white' : 'text-slate-500'}`}>
            {step}
          </div>
          {idx < 4 && <div className={`w-8 h-0.5 mx-2 ${wizardStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );

  const WizardStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-slate-300 mb-2">Program Name</label>
        <input
          type="text"
          value={newProgram.name}
          onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
          placeholder="e.g., Executive Travel Card"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
        />
      </div>
      
      <div>
        <label className="block text-sm text-slate-300 mb-2">Program Type</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'corporate', label: 'Corporate', desc: 'Employee expenses', icon: '💼' },
            { id: 'fleet', label: 'Fleet/Fuel', desc: 'Vehicle operations', icon: '🚗' },
            { id: 'meal', label: 'Meal Card', desc: 'Employee benefits', icon: '🍽️' },
            { id: 'travel', label: 'Travel', desc: 'Business trips', icon: '✈️' },
            { id: 'gift', label: 'Gift Card', desc: 'Rewards & incentives', icon: '🎁' },
            { id: 'transport', label: 'Transport', desc: 'Commute expenses', icon: '🚇' }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setNewProgram({...newProgram, type: type.id})}
              className={`p-4 rounded-xl border text-left transition-all ${
                newProgram.type === type.id 
                  ? 'bg-cyan-500/20 border-cyan-500 text-white' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl">{type.icon}</span>
              <div className="font-medium mt-2">{type.label}</div>
              <div className="text-xs text-slate-400">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const WizardStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-slate-300 mb-2">Funding Model</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'prepaid', label: 'Prepaid', desc: 'Load funds in advance', icon: '💵' },
            { id: 'debit', label: 'Debit', desc: 'Link to bank account', icon: '🏦' },
            { id: 'credit', label: 'Credit', desc: 'Credit line extended', icon: '💳' },
            { id: 'revolving', label: 'Revolving', desc: 'Replenishing credit', icon: '🔄' }
          ].map(model => (
            <button
              key={model.id}
              onClick={() => setNewProgram({...newProgram, fundingModel: model.id})}
              className={`p-4 rounded-xl border text-left transition-all ${
                newProgram.fundingModel === model.id 
                  ? 'bg-cyan-500/20 border-cyan-500 text-white' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl">{model.icon}</span>
              <div className="font-medium mt-2">{model.label}</div>
              <div className="text-xs text-slate-400">{model.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Form Factor</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'physical', label: 'Physical', icon: '💳' },
            { id: 'virtual', label: 'Virtual', icon: '📱' },
            { id: 'tokenized', label: 'Tokenized', icon: '⌚' }
          ].map(form => (
            <button
              key={form.id}
              onClick={() => {
                const current = newProgram.formFactor;
                const updated = current.includes(form.id) 
                  ? current.filter(f => f !== form.id)
                  : [...current, form.id];
                setNewProgram({...newProgram, formFactor: updated});
              }}
              className={`p-4 rounded-xl border text-center transition-all ${
                newProgram.formFactor.includes(form.id)
                  ? 'bg-cyan-500/20 border-cyan-500 text-white' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl">{form.icon}</span>
              <div className="font-medium mt-2">{form.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Card Scheme</label>
          <div className="flex gap-3">
            {['Visa', 'Mastercard'].map(scheme => (
              <button
                key={scheme}
                onClick={() => setNewProgram({...newProgram, scheme})}
                className={`flex-1 py-3 rounded-lg border font-medium transition-all ${
                  newProgram.scheme === scheme 
                    ? 'bg-cyan-500/20 border-cyan-500 text-white' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-300'
                }`}
              >
                {scheme}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-2">Currency</label>
          <select 
            value={newProgram.currency}
            onChange={(e) => setNewProgram({...newProgram, currency: e.target.value})}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="SEK">SEK - Swedish Krona</option>
          </select>
        </div>
      </div>
    </div>
  );

  const WizardStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">Daily Limit ({newProgram.currency})</label>
          <input
            type="number"
            value={newProgram.dailyLimit}
            onChange={(e) => setNewProgram({...newProgram, dailyLimit: parseInt(e.target.value)})}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-2">Monthly Limit ({newProgram.currency})</label>
          <input
            type="number"
            value={newProgram.monthlyLimit}
            onChange={(e) => setNewProgram({...newProgram, monthlyLimit: parseInt(e.target.value)})}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Allowed Merchant Categories (MCC)</label>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
          {mccCategories.map(mcc => (
            <button
              key={mcc.code}
              onClick={() => {
                const current = newProgram.mccRestrictions;
                const updated = current.includes(mcc.code) 
                  ? current.filter(c => c !== mcc.code)
                  : [...current, mcc.code];
                setNewProgram({...newProgram, mccRestrictions: updated});
              }}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${
                newProgram.mccRestrictions.includes(mcc.code)
                  ? 'bg-emerald-500/20 border-emerald-500 text-white' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span>{mcc.icon}</span>
              <div>
                <div className="font-medium">{mcc.name}</div>
                <div className="text-xs text-slate-500">MCC {mcc.code}</div>
              </div>
              {newProgram.mccRestrictions.includes(mcc.code) && (
                <span className="ml-auto text-emerald-400">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <span>🌍</span>
          <span className="font-medium">Geographic Restrictions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All Countries', 'Europe Only', 'EU + UK', 'Custom'].map(option => (
            <button
              key={option}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                option === 'Europe Only' 
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const WizardStep4 = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-4">Card Preview</div>
        <div className="relative w-80 h-48 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 rounded-2xl shadow-2xl transform rotate-3" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl shadow-xl border border-slate-600/50 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-12 h-10 rounded bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <div className="text-right">
                <div className="text-white font-bold text-lg">ENFUCE</div>
                <div className="text-slate-400 text-xs">{newProgram.scheme || 'VISA'}</div>
              </div>
            </div>
            <div>
              <div className="text-slate-300 font-mono tracking-widest text-lg mb-2">
                •••• •••• •••• 4242
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-slate-500 text-xs">CARDHOLDER</div>
                  <div className="text-white text-sm">JOHN DOE</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 text-xs">VALID THRU</div>
                  <div className="text-white text-sm">12/28</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Card Design Template</label>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'corporate', gradient: 'from-slate-700 to-slate-900' },
            { id: 'premium', gradient: 'from-amber-600 to-yellow-800' },
            { id: 'ocean', gradient: 'from-cyan-500 to-blue-700' },
            { id: 'sunset', gradient: 'from-orange-500 to-pink-600' }
          ].map(design => (
            <button
              key={design.id}
              className={`h-20 rounded-xl bg-gradient-to-br ${design.gradient} border-2 transition-all ${
                design.id === 'corporate' ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-transparent hover:border-slate-500'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <div className="text-white font-medium">Digital Wallet Provisioning</div>
            <div className="text-sm text-slate-400">Apple Pay, Google Pay, Samsung Pay</div>
          </div>
        </div>
        <div className="w-12 h-6 bg-cyan-500 rounded-full relative cursor-pointer">
          <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
        </div>
      </div>
    </div>
  );

  const WizardStep5 = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
          <div className="font-semibold text-white">Program Summary</div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Program Name', value: newProgram.name || 'Executive Travel Card' },
            { label: 'Type', value: newProgram.type || 'Corporate' },
            { label: 'Funding Model', value: newProgram.fundingModel || 'Prepaid' },
            { label: 'Form Factor', value: newProgram.formFactor.join(', ') || 'Physical, Virtual' },
            { label: 'Scheme', value: newProgram.scheme || 'Visa' },
            { label: 'Currency', value: newProgram.currency },
            { label: 'Daily Limit', value: `${newProgram.currency} ${newProgram.dailyLimit.toLocaleString()}` },
            { label: 'Monthly Limit', value: `${newProgram.currency} ${newProgram.monthlyLimit.toLocaleString()}` },
            { label: 'MCC Restrictions', value: `${newProgram.mccRestrictions.length} categories allowed` }
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-emerald-400 text-xl">✓</span>
          <div>
            <div className="text-emerald-300 font-medium">Compliance Check Passed</div>
            <div className="text-sm text-slate-400 mt-1">
              Program configuration meets all regulatory requirements. Ready for launch.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-xl">⚡</span>
          <div>
            <div className="text-amber-300 font-medium">API Integration Ready</div>
            <div className="text-sm text-slate-400 mt-1">
              Program ID will be: <code className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300">prg_un_travel_2024</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CreateProgramWizard = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Create Card Program</h2>
            <p className="text-slate-400 text-sm mt-1">Configure your new card program</p>
          </div>
          <button 
            onClick={() => {setShowCreateWizard(false); setWizardStep(1);}}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <WizardStepIndicator />
          {wizardStep === 1 && <WizardStep1 />}
          {wizardStep === 2 && <WizardStep2 />}
          {wizardStep === 3 && <WizardStep3 />}
          {wizardStep === 4 && <WizardStep4 />}
          {wizardStep === 5 && <WizardStep5 />}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-between">
          <button
            onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              wizardStep === 1 
                ? 'text-slate-600 cursor-not-allowed' 
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            disabled={wizardStep === 1}
          >
            Back
          </button>
          <button
            onClick={() => {
              if (wizardStep < 5) {
                setWizardStep(wizardStep + 1);
              } else {
                setShowCreateWizard(false);
                setWizardStep(1);
              }
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
          >
            {wizardStep === 5 ? 'Launch Program' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );

  const ProgramDetail = ({ program }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">
              💳
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{program.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={program.status} />
                <span className="text-slate-400 text-sm">{program.scheme}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setSelectedProgram(null)}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatsCard icon="💳" label="Active Cards" value={program.cards.toLocaleString()} color="text-cyan-400" />
            <StatsCard icon="💰" label="Total Spend" value={program.spend} color="text-emerald-400" />
            <StatsCard icon="📊" label="Avg Transaction" value="€47.20" color="text-amber-400" />
            <StatsCard icon="🔒" label="Declined" value="2.1%" color="text-red-400" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-semibold mb-4">Spend Controls</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Daily Limit</span>
                  <span className="text-white font-medium">€500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Limit</span>
                  <span className="text-white font-medium">€5,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Per Transaction</span>
                  <span className="text-white font-medium">€250</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-semibold mb-4">Allowed Categories</h3>
              <div className="flex flex-wrap gap-2">
                {['🍽️ Restaurants', '✈️ Airlines', '🏨 Hotels', '🚕 Transport'].map(cat => (
                  <span key={cat} className="px-3 py-1 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="flex-1 py-3 bg-cyan-500/20 text-cyan-300 rounded-lg font-medium hover:bg-cyan-500/30 transition-all border border-cyan-500/30">
              Edit Configuration
            </button>
            <button className="flex-1 py-3 bg-slate-700/50 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-all border border-slate-600">
              Issue New Card
            </button>
            <button className="flex-1 py-3 bg-slate-700/50 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-all border border-slate-600">
              View Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of your card programs</p>
        </div>
        <button
          onClick={() => setShowCreateWizard(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center gap-2"
        >
          <span>+</span> New Program
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatsCard icon="💳" label="Total Cards" value="4,248" change={12} color="text-cyan-400" />
        <StatsCard icon="💰" label="Monthly Volume" value="€2.78M" change={8} color="text-emerald-400" />
        <StatsCard icon="📊" label="Active Programs" value="5" color="text-amber-400" />
        <StatsCard icon="✅" label="Approval Rate" value="97.8%" change={2} color="text-purple-400" />
      </div>

      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Card Programs</h2>
          <div className="flex gap-2">
            {['All', 'Active', 'Draft'].map(filter => (
              <button
                key={filter}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'All' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-700/50">
          {cardPrograms.map(program => (
            <div 
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              className="p-5 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl border border-slate-600">
                  💳
                </div>
                <div>
                  <div className="text-white font-medium">{program.name}</div>
                  <div className="text-slate-400 text-sm">{program.type} • {program.scheme}</div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-white font-medium">{program.cards.toLocaleString()}</div>
                  <div className="text-slate-500 text-xs">Cards</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{program.spend}</div>
                  <div className="text-slate-500 text-xs">Volume</div>
                </div>
                <StatusBadge status={program.status} />
                <span className="text-slate-500">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const APISection = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API & Webhooks</h1>
        <p className="text-slate-400 mt-1">Manage your API keys and webhook configurations</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Keys</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-white font-medium">Production Key</div>
                  <div className="text-slate-500 text-xs mt-1">Created Nov 1, 2025</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded border border-emerald-500/30">Active</span>
              </div>
              <code className="text-cyan-300 text-sm bg-slate-800 px-3 py-1.5 rounded block mt-3">
                sk_live_••••••••••••••••4f2a
              </code>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-white font-medium">Sandbox Key</div>
                  <div className="text-slate-500 text-xs mt-1">Created Oct 15, 2025</div>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded border border-amber-500/30">Test</span>
              </div>
              <code className="text-cyan-300 text-sm bg-slate-800 px-3 py-1.5 rounded block mt-3">
                sk_test_••••••••••••••••8b1c
              </code>
            </div>
          </div>
          <button className="w-full mt-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-all">
            + Generate New Key
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Webhooks</h3>
          <div className="space-y-3">
            {[
              { event: 'card.created', url: 'https://api.un.org/webhooks/enfuce', status: 'Active' },
              { event: 'transaction.authorized', url: 'https://api.un.org/webhooks/enfuce', status: 'Active' },
              { event: 'card.blocked', url: 'https://api.un.org/webhooks/enfuce', status: 'Active' }
            ].map((webhook, idx) => (
              <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-between">
                <div>
                  <code className="text-cyan-300 text-sm">{webhook.event}</code>
                  <div className="text-slate-500 text-xs mt-1 truncate max-w-xs">{webhook.url}</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-all">
            + Add Webhook
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Reference</h3>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="text-slate-500"># Create a new card program</div>
          <div className="text-cyan-300 mt-2">curl -X POST https://api.enfuce.com/v1/programs \</div>
          <div className="text-slate-300 ml-4">-H "Authorization: Bearer sk_live_..." \</div>
          <div className="text-slate-300 ml-4">-H "Content-Type: application/json" \</div>
          <div className="text-slate-300 ml-4">-d '&#123;"name": "Travel Card", "type": "PREPAID"&#125;'</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex" style={{fontFamily: "'Inter', system-ui, sans-serif"}}>
      <SideNav />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search programs, cards, transactions..."
                className="w-80 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white relative">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-medium">
                UN
              </div>
              <div className="text-sm">
                <div className="text-white font-medium">Maria Chen</div>
                <div className="text-slate-500 text-xs">Program Administrator</div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="p-8">
          {activeSection === 'dashboard' && <Dashboard />}
          {activeSection === 'programs' && <Dashboard />}
          {activeSection === 'api' && <APISection />}
          {activeSection !== 'dashboard' && activeSection !== 'programs' && activeSection !== 'api' && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-6xl mb-4">🚧</div>
                <div className="text-xl text-white font-semibold">Coming Soon</div>
                <div className="text-slate-400 mt-2">This section is under development</div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {showCreateWizard && <CreateProgramWizard />}
      {selectedProgram && <ProgramDetail program={selectedProgram} />}
    </div>
  );
};

export default EnfucePortal;
