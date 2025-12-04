import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createConfiguration, transformWizardToAPI } from './api/configurationService';

const EnfucePortal = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [abTestVariant, setAbTestVariant] = useState(null);
  const [pricingVariant, setPricingVariant] = useState(null);
  const [wizardVariant, setWizardVariant] = useState(null); // 'traditional' or 'chat'
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
    countries: [],
    estimatedCards: 100,
    cardDesign: 'corporate',
    cardColor: '#2C3E50',
    cardBackgroundImage: null
  });

  // Save status for API integration
  const [saveStatus, setSaveStatus] = useState({
    loading: false,
    success: false,
    error: null,
    savedConfig: null
  });

  // Stable update handler to prevent component recreation
  const updateProgram = useCallback((updates) => {
    setNewProgram(prev => ({ ...prev, ...updates }));
  }, []);

  // Save configuration to API
  const saveConfiguration = useCallback(async () => {
    setSaveStatus({ loading: true, success: false, error: null, savedConfig: null });

    try {
      // Transform wizard data to API format
      const apiData = transformWizardToAPI(newProgram, {
        email: 'portal-user@enfuce.com', // TODO: Replace with actual user email when auth is implemented
        name: 'Portal User',
        company: 'Enfuce'
      });

      console.log('💾 Saving configuration to API:', apiData);

      // Call API to create configuration
      const result = await createConfiguration(apiData);

      console.log('✅ Configuration saved successfully:', result);

      setSaveStatus({
        loading: false,
        success: true,
        error: null,
        savedConfig: result.data
      });

      // Show success message for 3 seconds, then close wizard
      setTimeout(() => {
        setShowCreateWizard(false);
        setWizardStep(1);
        setChatMessages([]);
        setChatStep(0);
        setSaveStatus({ loading: false, success: false, error: null, savedConfig: null });
      }, 3000);

    } catch (error) {
      console.error('❌ Failed to save configuration:', error);

      setSaveStatus({
        loading: false,
        success: false,
        error: error.message || 'Failed to save configuration',
        savedConfig: null
      });
    }
  }, [newProgram]);

  // Wizard scroll management
  const scrollContainerRef = useRef(null);
  const prevStepRef = useRef(wizardStep);

  useEffect(() => {
    if (prevStepRef.current !== wizardStep && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      prevStepRef.current = wizardStep;
    }
  });

  // Pricing calculation function
  const calculatePricing = (program) => {
    let total = 0;
    let breakdown = {};

    // Base setup fee
    breakdown.setupFee = 500;
    total += breakdown.setupFee;

    // Card type multiplier
    const typeMultipliers = {
      prepaid: 1.0,
      debit: 1.2,
      credit: 1.5,
      revolving: 1.8
    };
    const typeMultiplier = typeMultipliers[program.fundingModel] || 1.0;

    // Form factor costs (per card)
    const formFactorCosts = {
      physical: 2,
      virtual: 0.5,
      tokenized: 1
    };
    breakdown.formFactorCost = 0;
    program.formFactor.forEach(ff => {
      breakdown.formFactorCost += (formFactorCosts[ff] || 0) * (program.estimatedCards || 100);
    });
    total += breakdown.formFactorCost;

    // Monthly platform fee
    breakdown.monthlyFee = 99 * typeMultiplier;
    total += breakdown.monthlyFee * 12; // Annual

    // Card scheme transaction fees (estimated annual)
    const schemeFees = {
      Visa: 0.10,
      Mastercard: 0.12
    };
    const avgTransactionsPerCard = 50; // Estimated annual transactions per card
    breakdown.annualTransactionFees =
      (schemeFees[program.scheme] || 0.10) *
      (program.estimatedCards || 100) *
      avgTransactionsPerCard;
    total += breakdown.annualTransactionFees;

    return {
      total: Math.round(total),
      breakdown,
      monthly: Math.round((total - breakdown.setupFee) / 12),
      perCard: program.estimatedCards > 0 ? Math.round(total / program.estimatedCards) : 0
    };
  };

  // A/B Test: Initialize variant assignment and analytics (2x2 factorial)
  useEffect(() => {
    // Check for URL query parameters to force variants
    const urlParams = new URLSearchParams(window.location.search);
    const forceCta = urlParams.get('cta'); // ?cta=A or ?cta=B
    const forcePricing = urlParams.get('pricing'); // ?pricing=live or ?pricing=final
    const forceWizard = urlParams.get('wizard'); // ?wizard=traditional or ?wizard=chat

    // Check if user already has variants assigned
    let ctaVariant = forceCta || localStorage.getItem('abtest_cta_variant');
    let pricingVar = forcePricing || localStorage.getItem('abtest_pricing_variant');
    let wizardVar = forceWizard || localStorage.getItem('abtest_wizard_variant');

    // Validate forced values
    if (ctaVariant && !['A', 'B'].includes(ctaVariant)) ctaVariant = null;
    if (pricingVar && !['live', 'final'].includes(pricingVar)) pricingVar = null;
    if (wizardVar && !['traditional', 'chat'].includes(wizardVar)) wizardVar = null;

    if (!ctaVariant || !pricingVar || !wizardVar) {
      // Randomly assign variants
      ctaVariant = ctaVariant || (Math.random() < 0.5 ? 'A' : 'B');
      pricingVar = pricingVar || (Math.random() < 0.5 ? 'live' : 'final');
      wizardVar = wizardVar || (Math.random() < 0.5 ? 'traditional' : 'chat');

      localStorage.setItem('abtest_cta_variant', ctaVariant);
      localStorage.setItem('abtest_pricing_variant', pricingVar);
      localStorage.setItem('abtest_wizard_variant', wizardVar);
    }

    // If forced via URL, update localStorage
    if (forceCta || forcePricing || forceWizard) {
      if (forceCta) localStorage.setItem('abtest_cta_variant', ctaVariant);
      if (forcePricing) localStorage.setItem('abtest_pricing_variant', pricingVar);
      if (forceWizard) localStorage.setItem('abtest_wizard_variant', wizardVar);
      console.log('🎯 Forced variants:', { cta: ctaVariant, pricing: pricingVar, wizard: wizardVar });
    }

    setAbTestVariant(ctaVariant);
    setPricingVariant(pricingVar);
    setWizardVariant(wizardVar);

    // Track impression (page load) - use local variables, not state
    trackImpression(ctaVariant, pricingVar);

    // Make analytics accessible in console for debugging
    window.getABTestAnalytics = () => {
      const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
      const summary = {
        total: events.length,
        byVariant: {}
      };

      events.forEach(event => {
        const variantKey = `${event.ctaVariant}${event.pricingVariant}`;
        if (!summary.byVariant[variantKey]) {
          summary.byVariant[variantKey] = {
            impressions: 0,
            clicks: 0,
            purchases: 0
          };
        }
        summary.byVariant[variantKey].impressions++;
        if (event.clickSource) summary.byVariant[variantKey].clicks++;
        if (event.purchased) summary.byVariant[variantKey].purchases++;
      });

      console.log('A/B Test Summary:');
      console.table(summary.byVariant);
      return { events, summary };
    };

    // Console commands for forcing variants
    window.forceVariants = (cta, pricing, wizard) => {
      if (cta && ['A', 'B'].includes(cta)) {
        localStorage.setItem('abtest_cta_variant', cta);
        console.log(`✓ CTA variant set to: ${cta}`);
      }
      if (pricing && ['live', 'final'].includes(pricing)) {
        localStorage.setItem('abtest_pricing_variant', pricing);
        console.log(`✓ Pricing variant set to: ${pricing}`);
      }
      if (wizard && ['traditional', 'chat'].includes(wizard)) {
        localStorage.setItem('abtest_wizard_variant', wizard);
        console.log(`✓ Wizard variant set to: ${wizard}`);
      }
      console.log('🔄 Reload the page to see changes.');
      console.log('Current variants:', {
        cta: localStorage.getItem('abtest_cta_variant'),
        pricing: localStorage.getItem('abtest_pricing_variant'),
        wizard: localStorage.getItem('abtest_wizard_variant')
      });
    };

    // Show current variants
    window.showVariants = () => {
      const variants = {
        cta: localStorage.getItem('abtest_cta_variant'),
        pricing: localStorage.getItem('abtest_pricing_variant'),
        wizard: localStorage.getItem('abtest_wizard_variant')
      };
      console.log('📊 Current A/B Test Variants:');
      console.table(variants);
      return variants;
    };

    // Quick presets
    window.forcePresets = {
      dashboardChat: () => {
        window.forceVariants('B', 'live', 'chat');
        console.log('📱 Preset: Dashboard + Chat + Live Pricing');
      },
      headerTraditional: () => {
        window.forceVariants('A', 'final', 'traditional');
        console.log('📄 Preset: Header + Traditional + Final Pricing');
      },
      reset: () => {
        localStorage.removeItem('abtest_cta_variant');
        localStorage.removeItem('abtest_pricing_variant');
        localStorage.removeItem('abtest_wizard_variant');
        console.log('🔄 Variants reset. Reload to get random assignment.');
      }
    };

    // Log available commands
    console.log('🎯 A/B Testing Console Commands:');
    console.log('  window.showVariants() - Show current variants');
    console.log('  window.forceVariants(cta, pricing, wizard) - Force specific variants');
    console.log('    Example: window.forceVariants("B", "live", "chat")');
    console.log('  window.forcePresets.dashboardChat() - Dashboard + Chat preset');
    console.log('  window.forcePresets.headerTraditional() - Header + Traditional preset');
    console.log('  window.forcePresets.reset() - Reset to random');
    console.log('');
    console.log('💡 URL Parameters (force without console):');
    console.log('  ?cta=B&pricing=live&wizard=chat');

    window.downloadCSV = () => {
      const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
      const csv = convertToCSV(events);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ab-test-data-${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      console.log('CSV downloaded successfully!');
    };

    window.resetABTest = () => {
      localStorage.removeItem('abtest_cta_variant');
      localStorage.removeItem('abtest_pricing_variant');
      localStorage.removeItem('conversion_events');
      console.log('A/B test data cleared. Refresh the page to get a new variant assignment.');
    };

    const variantName = `${ctaVariant}${pricingVar}`;
    console.log('📊 A/B Test Active - Variant:', variantName);
    console.log('  CTA Placement:', ctaVariant === 'A' ? 'Header' : 'Dashboard');
    console.log('  Pricing Display:', pricingVar === 'live' ? 'Live/Dynamic' : 'Final Summary');
    console.log('💡 Use window.getABTestAnalytics() to view analytics');
    console.log('💡 Use window.downloadCSV() to download data');
    console.log('💡 Use window.resetABTest() to reset and get reassigned');
  }, []);

  // CSV conversion function
  const convertToCSV = (events) => {
    if (events.length === 0) return '';

    const headers = Object.keys(events[0]).join(',');
    const rows = events.map(event =>
      Object.values(event).map(val =>
        typeof val === 'object' ? JSON.stringify(val).replace(/,/g, ';') : val
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  };

  // Send event to API
  const sendEventToAPI = async (eventData) => {
    try {
      // Use sendBeacon for critical events (clicks) to ensure delivery
      // even if page navigates or UI changes immediately after
      const isCriticalEvent = eventData.eventType === 'click';

      if (isCriticalEvent && navigator.sendBeacon) {
        // sendBeacon is more reliable for events that happen during transitions
        const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
        const sent = navigator.sendBeacon('/api/events', blob);

        if (!sent) {
          // Fallback to fetch if sendBeacon fails
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
            keepalive: true // Keep request alive even if page unloads
          });
        }
      } else {
        // Regular fetch for non-critical events
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
          keepalive: eventData.eventType === 'purchase' // Also keep purchases alive
        });

        if (!response.ok) {
          console.warn('Failed to send event to API:', response.statusText);
        }
      }
    } catch (error) {
      console.warn('Error sending event to API:', error);
      // Fallback: Continue working even if API fails
    }
  };

  // Track page impression
  const trackImpression = (ctaVar, pricingVar) => {
    const sessionId = localStorage.getItem('session_id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);

    const eventData = {
      timestamp: new Date().toISOString(),
      sessionId,
      eventType: 'impression',
      ctaVariant: ctaVar,
      pricingVariant: pricingVar,
      clickSource: null,
      purchased: false,
      programConfig: null,
      pricing: null
    };

    // Send to API
    sendEventToAPI(eventData);

    // Also keep in localStorage as backup
    const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
    events.push(eventData);
    localStorage.setItem('conversion_events', JSON.stringify(events));
  };

  // Track CTA click
  const trackCTAClick = (source) => {
    const sessionId = localStorage.getItem('session_id');

    const eventData = {
      timestamp: new Date().toISOString(),
      sessionId,
      eventType: 'click',
      ctaVariant: abTestVariant,
      pricingVariant: pricingVariant,
      clickSource: source,
      purchased: false,
      programConfig: null,
      pricing: null
    };

    // Send to API
    sendEventToAPI(eventData);

    // Also keep in localStorage as backup
    const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
    events.push(eventData);
    localStorage.setItem('conversion_events', JSON.stringify(events));

    console.log('A/B Test Click:', {
      variant: `${abTestVariant}${pricingVariant}`,
      source
    });
  };

  // Track purchase (conversion)
  const trackPurchase = () => {
    const sessionId = localStorage.getItem('session_id');
    const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
    const pricing = calculatePricing(newProgram);

    const eventData = {
      timestamp: new Date().toISOString(),
      sessionId,
      eventType: 'purchase',
      ctaVariant: abTestVariant,
      pricingVariant: pricingVariant,
      wizardVariant: wizardVariant, // Add wizard variant to track chat vs traditional
      clickSource: events.find(e => e.sessionId === sessionId && e.eventType === 'click')?.clickSource || 'unknown',
      purchased: true,
      programConfig: JSON.stringify(newProgram).replace(/,/g, ';'),
      pricing: pricing.total
    };

    // Send to API
    sendEventToAPI(eventData);

    // Also keep in localStorage as backup
    events.push(eventData);
    localStorage.setItem('conversion_events', JSON.stringify(events));

    console.log('A/B Test Purchase:', {
      variant: `${abTestVariant}${pricingVariant}`,
      pricing: pricing.total,
      config: newProgram
    });
  };

  // Handle opening wizard
  const handleOpenWizard = (source) => {
    trackCTAClick(source);
    setShowCreateWizard(true);
  };

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
      'Active': 'bg-[#7DD3C0]/20 text-[#7DD3C0] border-[#7DD3C0]/40',
      'Draft': 'bg-[#FFD93D]/20 text-[#FFD93D] border-[#FFD93D]/40',
      'Suspended': 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${colors[status]} uppercase tracking-wide`}>
        {status}
      </span>
    );
  };

  // Live Pricing Sidebar (for variants with live pricing)
  const LivePricingSidebar = () => {
    const pricing = calculatePricing(newProgram);

    return (
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-5 sticky top-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">💰</span>
          <h3 className="text-white font-semibold">Estimated Pricing</h3>
        </div>

        <div className="space-y-3 mb-4 pb-4 border-b border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Setup Fee</span>
            <span className="text-white">€{pricing.breakdown.setupFee}</span>
          </div>
          {pricing.breakdown.formFactorCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Card Production</span>
              <span className="text-white">€{Math.round(pricing.breakdown.formFactorCost)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Annual Platform Fee</span>
              <span className="text-white">€{Math.round(pricing.breakdown.monthlyFee * 12)}</span>
          </div>
          {pricing.breakdown.annualTransactionFees > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Est. Transaction Fees</span>
              <span className="text-white">€{Math.round(pricing.breakdown.annualTransactionFees)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">First Year Total</span>
            <span className="text-2xl font-bold text-cyan-400">€{pricing.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Monthly (avg)</span>
            <span className="text-slate-300">€{pricing.monthly.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Per Card</span>
            <span className="text-slate-300">€{pricing.perCard}/card</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            Based on {newProgram.estimatedCards} cards
          </div>
        </div>
      </div>
    );
  };

  const SideNav = () => (
    <div className="w-full lg:w-64 bg-[#1a2332] border-r border-[#7DD3C0]/20 flex flex-col">
      <div className="p-6 border-b border-[#7DD3C0]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#7DD3C0] flex items-center justify-center">
            <span className="text-[#2C3E50] font-bold text-lg">E</span>
          </div>
          <div>
            <div className="text-white font-semibold">Enfuce Portal</div>
            <div className="text-[#7DD3C0]/70 text-xs">Card Configuration</div>
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
          { id: 'analytics', icon: '📈', label: 'A/B Test Analytics' },
          { id: 'api', icon: '⚡', label: 'API & Webhooks' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
              activeSection === item.id
                ? 'bg-[#7DD3C0]/20 text-[#7DD3C0] border border-[#7DD3C0]/30'
                : 'text-gray-300 hover:bg-[#2C3E50] hover:text-white'
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
          onChange={(e) => updateProgram({ name: e.target.value })}
          placeholder="e.g., Executive Travel Card"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
          autoComplete="off"
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
              onClick={() => updateProgram({ type: type.id })}
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
              onClick={() => updateProgram({ fundingModel: model.id })}
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
                updateProgram({ formFactor: updated });
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
                onClick={() => updateProgram({ scheme })}
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
            onChange={(e) => updateProgram({ currency: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="SEK">SEK - Swedish Krona</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Estimated Number of Cards</label>
        <input
          type="number"
          value={newProgram.estimatedCards}
          onChange={(e) => updateProgram({ estimatedCards: parseInt(e.target.value) || 0 })}
          placeholder="100"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
          min="1"
          autoComplete="off"
        />
        <div className="text-xs text-slate-500 mt-1">Used for pricing calculation</div>
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
            onChange={(e) => updateProgram({ dailyLimit: parseInt(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-2">Monthly Limit ({newProgram.currency})</label>
          <input
            type="number"
            value={newProgram.monthlyLimit}
            onChange={(e) => updateProgram({ monthlyLimit: parseInt(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none"
            autoComplete="off"
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
                updateProgram({ mccRestrictions: updated });
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

  const WizardStep4 = () => {
    const getCardBackground = () => {
      if (newProgram.cardBackgroundImage) {
        return `url(${newProgram.cardBackgroundImage})`;
      }

      const designs = {
        corporate: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        premium: 'linear-gradient(135deg, #d97706 0%, #ca8a04 100%)',
        ocean: 'linear-gradient(135deg, #06b6d4 0%, #1d4ed8 100%)',
        sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
        custom: newProgram.cardColor
      };

      return designs[newProgram.cardDesign] || designs.corporate;
    };

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateProgram({ cardBackgroundImage: reader.result, cardDesign: 'custom' });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="text-sm text-slate-400 mb-4">Card Preview</div>
          <div className="relative w-80 h-48 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 rounded-2xl shadow-2xl transform rotate-3" />
            <div
              className="absolute inset-0 rounded-2xl shadow-xl border border-slate-600/50 p-6 flex flex-col justify-between"
              style={{
                background: getCardBackground(),
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-10 rounded bg-gradient-to-br from-yellow-400 to-yellow-600" />
                <div className="text-right">
                  <div className="text-white font-bold text-lg drop-shadow-lg">ENFUCE</div>
                  <div className="text-slate-200 text-xs drop-shadow">{newProgram.scheme || 'VISA'}</div>
                </div>
              </div>
              <div>
                <div className="text-slate-100 font-mono tracking-widest text-lg mb-2 drop-shadow-lg">
                  •••• •••• •••• 4242
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-slate-300 text-xs drop-shadow">CARDHOLDER</div>
                    <div className="text-white text-sm drop-shadow-lg">JOHN DOE</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-300 text-xs drop-shadow">VALID THRU</div>
                    <div className="text-white text-sm drop-shadow-lg">12/28</div>
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
              { id: 'corporate', gradient: 'from-slate-700 to-slate-900', label: 'Corporate' },
              { id: 'premium', gradient: 'from-amber-600 to-yellow-800', label: 'Premium' },
              { id: 'ocean', gradient: 'from-cyan-500 to-blue-700', label: 'Ocean' },
              { id: 'sunset', gradient: 'from-orange-500 to-pink-600', label: 'Sunset' }
            ].map(design => (
              <button
                key={design.id}
                onClick={() => updateProgram({ cardDesign: design.id, cardBackgroundImage: null })}
                className={`h-20 rounded-xl bg-gradient-to-br ${design.gradient} border-2 transition-all relative group ${
                  newProgram.cardDesign === design.id ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-transparent hover:border-slate-500'
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <span className="text-white text-xs font-medium">{design.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Custom Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={newProgram.cardColor}
                onChange={(e) => updateProgram({ cardColor: e.target.value, cardDesign: 'custom', cardBackgroundImage: null })}
                className="w-16 h-10 rounded-lg border border-slate-600 bg-slate-800 cursor-pointer"
              />
              <input
                type="text"
                value={newProgram.cardColor}
                onChange={(e) => updateProgram({ cardColor: e.target.value, cardDesign: 'custom', cardBackgroundImage: null })}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                placeholder="#2C3E50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Background Image</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="cardImageUpload"
              />
              <label
                htmlFor="cardImageUpload"
                className="flex items-center justify-center gap-2 w-full h-10 bg-slate-800 border border-slate-600 rounded-lg px-4 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <span className="text-lg">📸</span>
                <span className="text-sm">{newProgram.cardBackgroundImage ? 'Change Image' : 'Upload Image'}</span>
              </label>
            </div>
            {newProgram.cardBackgroundImage && (
              <button
                onClick={() => updateProgram({ cardBackgroundImage: null })}
                className="text-xs text-red-400 hover:text-red-300 mt-1"
              >
                Remove image
              </button>
            )}
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
  };

  const WizardStep5 = () => {
    const pricing = calculatePricing(newProgram);

    return (
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
              { label: 'Estimated Cards', value: newProgram.estimatedCards.toLocaleString() },
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

        {/* Pricing Summary (shown for all variants on final step) */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h3 className="text-xl font-bold text-white">Pricing Summary</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Setup Fee</span>
              <span className="text-white">€{pricing.breakdown.setupFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Card Production ({newProgram.estimatedCards} cards)</span>
              <span className="text-white">€{Math.round(pricing.breakdown.formFactorCost).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Annual Platform Fee</span>
              <span className="text-white">€{Math.round(pricing.breakdown.monthlyFee * 12).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Est. Annual Transaction Fees</span>
              <span className="text-white">€{Math.round(pricing.breakdown.annualTransactionFees).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-cyan-500/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-lg">First Year Total</span>
              <span className="text-3xl font-bold text-cyan-400">€{pricing.total.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400">Monthly Average</div>
                <div className="text-lg font-semibold text-white">€{pricing.monthly.toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400">Cost Per Card</div>
                <div className="text-lg font-semibold text-white">€{pricing.perCard}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 text-xl">✓</span>
            <div>
              <div className="text-emerald-300 font-medium">Compliance Check Passed</div>
              <div className="text-sm text-slate-400 mt-1">
                Program configuration meets all regulatory requirements. Ready to proceed.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Chat state for conversational wizard
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStep, setChatStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [aiProvider, setAiProvider] = useState('local'); // 'local', 'openai', or 'anthropic' (default: local)
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [resetConfirmPending, setResetConfirmPending] = useState(false);
  const chatEndRef = useRef(null);

  // Conversation flow for chat wizard
  const conversationSteps = [
    { question: "Hi! I'm here to help you create a new card program. 🤖\n\nI understand natural language - just answer in your own words! You can also type 'help' anytime, 'back' to go to the previous question, or 'summary' to see your progress.\n\nLet's get started! What would you like to name your card program?", field: 'name', type: 'text' },
    { question: "Great! What type of card program is this? (e.g., Corporate, Fleet/Fuel, Meal Card, Travel, Gift Card, or Transport)", field: 'type', type: 'select', options: ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport'] },
    { question: "Perfect! What funding model would you like? (Prepaid, Debit, Credit, or Revolving)", field: 'fundingModel', type: 'select', options: ['prepaid', 'debit', 'credit', 'revolving'] },
    { question: "Which card form factors should we include? You can choose multiple: Physical, Virtual, Tokenized (separate with commas)", field: 'formFactor', type: 'multiselect', options: ['physical', 'virtual', 'tokenized'] },
    { question: "Which card scheme would you prefer? (Visa or Mastercard)", field: 'scheme', type: 'select', options: ['Visa', 'Mastercard'] },
    { question: "What currency should the program use? (EUR, USD, GBP, or SEK)", field: 'currency', type: 'select', options: ['EUR', 'USD', 'GBP', 'SEK'] },
    { question: "How many cards do you estimate you'll need?", field: 'estimatedCards', type: 'number' },
    { question: "Almost done! What should the daily spending limit be? (in your selected currency)", field: 'dailyLimit', type: 'number' },
    { question: "And what about the monthly spending limit?", field: 'monthlyLimit', type: 'number' },
    { question: "Excellent! I've gathered all the information. Let me create your program summary...", field: 'complete', type: 'complete' }
  ];

  const addChatMessage = useCallback((message, isUser = false) => {
    setChatMessages(prev => [...prev, { text: message, isUser, timestamp: new Date() }]);
  }, []);

  const simulateTyping = useCallback((message, callback) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addChatMessage(message, false);
      if (callback) callback();
    }, 500 + Math.random() * 500); // Simulate typing delay
  }, [addChatMessage]);

  const handleChatSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatStep >= conversationSteps.length) return;

    const userMessage = chatInput.trim();
    addChatMessage(userMessage, true);
    setChatInput('');

    // Check for reset confirmation
    if (resetConfirmPending) {
      if (userMessage.toLowerCase() === 'yes') {
        // Reset the wizard
        setChatMessages([]);
        setChatStep(0);
        setConversationHistory([]);
        setPendingConfirmation(null);
        setResetConfirmPending(false);
        setNewProgram({
          name: '',
          type: '',
          fundingModel: '',
          formFactor: [],
          scheme: '',
          currency: 'EUR',
          estimatedCards: 100,
          dailyLimit: 500,
          monthlyLimit: 5000,
          cardColor: '#1e293b',
          cardDesign: 'corporate'
        });
        simulateTyping("Let's start fresh! What would you like to name your card program?", () => {
          setChatStep(0);
        });
        return;
      } else {
        setResetConfirmPending(false);
        simulateTyping("Okay, let's continue. " + conversationSteps[chatStep].question);
        return;
      }
    }

    const currentStep = conversationSteps[chatStep];

    try {
      // Call AI validation API
      const response = await fetch('/api/ai-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: aiProvider,
          action: 'validate',
          context: {
            current_question: currentStep,
            user_input: userMessage,
            conversation_history: conversationHistory,
            collected_data: newProgram
          }
        })
      });

      if (!response.ok) {
        throw new Error('AI validation failed');
      }

      const result = await response.json();

      // Debug: Log which provider was actually used
      console.log('🤖 AI Provider Used:', result.provider_used || 'unknown');
      console.log('📊 AI Response:', result);

      // Handle commands
      if (result.is_command) {
        simulateTyping(result.ai_response);

        if (result.command === 'reset') {
          setResetConfirmPending(true);
        } else if (result.command === 'back') {
          if (chatStep > 0) {
            const prevStep = chatStep - 1;
            setChatStep(prevStep);
            setTimeout(() => {
              simulateTyping(conversationSteps[prevStep].question);
            }, 1000);
          } else {
            setTimeout(() => {
              simulateTyping("We're already at the first question!");
            }, 1000);
          }
        } else if (result.command === 'summary') {
          // Just show the summary, don't change step
        } else if (result.command === 'help') {
          // Just show help, don't change step
        } else if (result.command === 'skip') {
          // Move to next step
          proceedToNextStep();
        }

        return;
      }

      // Handle validation result
      if (result.validated) {
        const extractedValue = result.extracted_value !== undefined ? result.extracted_value : userMessage;

        // Show AI response
        if (result.ai_response) {
          simulateTyping(result.ai_response);
        }

        // If confidence is low or requires clarification, ask for confirmation
        if (result.requires_clarification || (result.confidence && result.confidence < 0.7)) {
          setPendingConfirmation({
            field: currentStep.field,
            value: extractedValue,
            step: chatStep
          });
          return;
        }

        // Update program data with validated value
        if (currentStep.field !== 'complete') {
          updateProgram({ [currentStep.field]: extractedValue });

          // Add to conversation history
          setConversationHistory(prev => [
            ...prev,
            {
              question: currentStep.question,
              field: currentStep.field,
              user_input: userMessage,
              extracted_value: extractedValue
            }
          ]);
        }

        // Track chat step completion
        const sessionId = localStorage.getItem('session_id');
        sendEventToAPI({
          timestamp: new Date().toISOString(),
          sessionId,
          eventType: 'chat_wizard_event',
          event_action: 'chat_wizard_step_completed',
          ctaVariant: abTestVariant,
          pricingVariant: pricingVariant,
          wizardVariant: wizardVariant,
          step: chatStep + 1,
          field: currentStep.field,
          step_name: currentStep.question.substring(0, 50),
          ai_confidence: result.confidence || 1.0
        });

        if (typeof gtag !== 'undefined') {
          gtag('event', 'chat_wizard_step_completed', {
            step: chatStep + 1,
            field: currentStep.field,
            step_name: currentStep.question.substring(0, 50)
          });
        }

        // Proceed to next step
        setTimeout(() => {
          proceedToNextStep();
        }, 1500);

      } else {
        // Validation failed - show clarification
        if (result.ai_response) {
          simulateTyping(result.ai_response);
        } else {
          simulateTyping("I didn't quite understand that. Could you try again?");
        }
      }

    } catch (error) {
      console.error('AI validation error:', error);
      // Fallback to simple local parsing
      fallbackLocalParsing(userMessage, currentStep);
    }
  }, [chatInput, chatStep, addChatMessage, simulateTyping, updateProgram, aiProvider, conversationHistory, newProgram, resetConfirmPending, abTestVariant, pricingVariant, wizardVariant]);

  // Helper function to proceed to next step
  const proceedToNextStep = useCallback(() => {
    const nextStep = chatStep + 1;
    if (nextStep < conversationSteps.length) {
      simulateTyping(conversationSteps[nextStep].question, () => {
        setChatStep(nextStep);
      });
    } else {
      // Complete - show summary
      simulateTyping("🎉 Perfect! Your card program is ready. Click 'Complete Program' to finish!", () => {
        setChatStep(nextStep);
      });
    }
  }, [chatStep, simulateTyping, conversationSteps]);

  // Fallback local parsing (when AI API fails)
  const fallbackLocalParsing = useCallback((userMessage, currentStep) => {
    let processedValue = userMessage;

    // Parse and validate response based on field type
    if (currentStep.type === 'multiselect') {
      const values = userMessage.toLowerCase().split(',').map(v => v.trim());
      const validValues = values.filter(v => currentStep.options.some(opt => opt.toLowerCase().includes(v) || v.includes(opt.toLowerCase())));
      processedValue = validValues.length > 0 ? validValues : [currentStep.options[0]];
    } else if (currentStep.type === 'select') {
      const foundOption = currentStep.options.find(opt =>
        opt.toLowerCase().includes(userMessage.toLowerCase()) ||
        userMessage.toLowerCase().includes(opt.toLowerCase())
      );
      processedValue = foundOption || currentStep.options[0];
    } else if (currentStep.type === 'number') {
      const num = parseInt(userMessage.replace(/[^0-9]/g, ''));
      processedValue = isNaN(num) ? (currentStep.field === 'estimatedCards' ? 100 : 500) : num;
    }

    // Update program data
    if (currentStep.field !== 'complete') {
      updateProgram({ [currentStep.field]: processedValue });
    }

    simulateTyping(`Got it! Moving to the next question...`, () => {
      proceedToNextStep();
    });
  }, [updateProgram, simulateTyping, proceedToNextStep]);

  // AI Provider console commands (only run once on mount)
  useEffect(() => {
    // Create a ref to the current provider for the getter function
    window.getAIProvider = () => {
      console.log(`🤖 Current AI Provider: ${window._currentAIProvider || 'local'}`);
      return window._currentAIProvider || 'local';
    };

    window.setAIProvider = (provider) => {
      if (['local', 'anthropic', 'openai'].includes(provider)) {
        setAiProvider(provider);
        window._currentAIProvider = provider;
        console.log(`✓ AI Provider changed to: ${provider}`);
        if (provider === 'local') {
          console.log('  → Using local rule-based validation (free, fast)');
        } else if (provider === 'anthropic') {
          console.log('  → Using Anthropic Claude (conversational, costs ~$0.006/conversation)');
        } else if (provider === 'openai') {
          console.log('  → Using OpenAI GPT-4 (advanced, costs ~$0.02/conversation)');
        }
      } else {
        console.error('Invalid provider. Use: "local", "anthropic", or "openai"');
      }
    };

    // Initialize the global provider ref
    window._currentAIProvider = 'local';

    // Log AI commands (only once)
    console.log('🤖 AI Provider Commands:');
    console.log('  window.getAIProvider() - Show current AI provider');
    console.log('  window.setAIProvider("local") - Use local validation (default)');
    console.log('  window.setAIProvider("anthropic") - Use Anthropic Claude');
    console.log('  window.setAIProvider("openai") - Use OpenAI GPT-4');
  }, []); // Empty dependency array - run once on mount

  // Update global ref when aiProvider changes
  useEffect(() => {
    window._currentAIProvider = aiProvider;
  }, [aiProvider]);

  // Initialize chat when wizard opens in chat mode
  useEffect(() => {
    if (showCreateWizard && wizardVariant === 'chat' && chatMessages.length === 0) {
      // Track chat wizard start
      const sessionId = localStorage.getItem('session_id');
      sendEventToAPI({
        timestamp: new Date().toISOString(),
        sessionId,
        eventType: 'chat_wizard_event',
        event_action: 'chat_wizard_started',
        ctaVariant: abTestVariant,
        pricingVariant: pricingVariant,
        wizardVariant: wizardVariant
      });

      if (typeof gtag !== 'undefined') {
        gtag('event', 'chat_wizard_started', {
          wizard_variant: 'chat',
          timestamp: new Date().toISOString()
        });
      }

      simulateTyping(conversationSteps[0].question, () => {
        setChatStep(0);
      });
    }
  }, [showCreateWizard, wizardVariant, chatMessages.length, simulateTyping]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Chat Wizard Modal
  const renderChatWizard = () => {
    const pricing = calculatePricing(newProgram);

    const getCardBackground = () => {
      if (newProgram.cardBackgroundImage) {
        return `url(${newProgram.cardBackgroundImage})`;
      }

      const designs = {
        corporate: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        premium: 'linear-gradient(135deg, #d97706 0%, #ca8a04 100%)',
        ocean: 'linear-gradient(135deg, #06b6d4 0%, #1d4ed8 100%)',
        sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
        custom: newProgram.cardColor
      };

      return designs[newProgram.cardDesign] || designs.corporate;
    };

    return (
      <div className="fixed inset-0 bg-[#1a2332] z-50 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#7DD3C0]/20 flex justify-between items-center bg-[#2C3E50]/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7DD3C0] to-[#7DD3C0]/60 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Program Assistant</h2>
                <p className="text-[#7DD3C0] text-sm">Let's create your card program together</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Track chat wizard abandonment
                const sessionId = localStorage.getItem('session_id');
                sendEventToAPI({
                  timestamp: new Date().toISOString(),
                  sessionId,
                  eventType: 'chat_wizard_event',
                  event_action: 'chat_wizard_abandoned',
                  ctaVariant: abTestVariant,
                  pricingVariant: pricingVariant,
                  wizardVariant: wizardVariant,
                  step: chatStep,
                  messages_count: chatMessages.length
                });

                if (typeof gtag !== 'undefined') {
                  gtag('event', 'chat_wizard_abandoned', {
                    step: chatStep,
                    messages_count: chatMessages.length
                  });
                }

                setShowCreateWizard(false);
                setChatMessages([]);
                setChatStep(0);
                setChatInput('');
              }}
              className="text-[#7DD3C0] hover:text-[#FFD93D] text-4xl font-light transition-colors"
            >
              ×
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-5 py-4 ${
                  msg.isUser
                    ? 'bg-[#7DD3C0] text-[#2C3E50]'
                    : 'bg-[#2C3E50]/50 text-white border border-[#7DD3C0]/20'
                }`}>
                  <p className="text-base">{msg.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#2C3E50]/50 text-white border border-[#7DD3C0]/20 rounded-2xl px-5 py-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#7DD3C0] rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-[#7DD3C0] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-2 h-2 bg-[#7DD3C0] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Error Message */}
          {saveStatus.error && (
            <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-semibold text-red-400 mb-1">Failed to Save Configuration</div>
                  <div className="text-sm text-red-300">{saveStatus.error}</div>
                  <button
                    onClick={() => setSaveStatus({ ...saveStatus, error: null })}
                    className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-[#7DD3C0]/20 bg-[#2C3E50]/30">
            {chatStep < conversationSteps.length - 1 ? (
              <div className="space-y-3">
                {/* Quick Command Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setChatInput('summary');
                      setTimeout(() => handleChatSubmit({ preventDefault: () => {} }), 100);
                    }}
                    className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600/50 transition-colors border border-slate-600/30"
                  >
                    📊 Summary
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('back');
                      setTimeout(() => handleChatSubmit({ preventDefault: () => {} }), 100);
                    }}
                    disabled={chatStep === 0}
                    className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600/50 transition-colors border border-slate-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('help');
                      setTimeout(() => handleChatSubmit({ preventDefault: () => {} }), 100);
                    }}
                    className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600/50 transition-colors border border-slate-600/30"
                  >
                    ❓ Help
                  </button>
                  <button
                    onClick={() => {
                      setChatInput('reset');
                      setTimeout(() => handleChatSubmit({ preventDefault: () => {} }), 100);
                    }}
                    className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-600/50 transition-colors border border-slate-600/30"
                  >
                    🔄 Reset
                  </button>
                  <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full animate-pulse ${aiProvider === 'local' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                      {aiProvider === 'local' ? 'Local AI' : aiProvider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI GPT-4'}
                    </span>
                  </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleChatSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your answer or a command..."
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:border-[#7DD3C0] focus:ring-2 focus:ring-[#7DD3C0] outline-none text-lg"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="px-8 py-4 bg-[#FFD93D] text-[#2C3E50] rounded-xl font-bold hover:bg-[#FFC700] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
                  >
                    Send
                  </button>
                </form>

                {/* Help Text */}
                <div className="text-xs text-slate-500 text-center">
                  💡 Tip: Just type naturally! I understand phrases like "about 50 employees" or "we're in Sweden"
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  trackPurchase();

                  // Track chat wizard completion
                  const sessionId = localStorage.getItem('session_id');
                  sendEventToAPI({
                    timestamp: new Date().toISOString(),
                    sessionId,
                    eventType: 'chat_wizard_event',
                    event_action: 'chat_wizard_completed',
                    ctaVariant: abTestVariant,
                    pricingVariant: pricingVariant,
                    wizardVariant: wizardVariant,
                    messages_count: chatMessages.length,
                    program_name: newProgram.name
                  });

                  if (typeof gtag !== 'undefined') {
                    gtag('event', 'chat_wizard_completed', {
                      messages_count: chatMessages.length,
                      program_name: newProgram.name
                    });
                  }

                  // Save configuration to API
                  saveConfiguration();
                }}
                disabled={saveStatus.loading}
                className={`w-full px-8 py-4 rounded-xl font-bold transition-all shadow-lg text-lg ${
                  saveStatus.loading
                    ? 'bg-slate-600 text-slate-400 cursor-wait'
                    : saveStatus.success
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#7DD3C0] text-[#2C3E50] hover:bg-[#6BC3B0]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saveStatus.loading
                  ? '💾 Saving Configuration...'
                  : saveStatus.success
                    ? '✅ Configuration Saved!'
                    : '🎉 Complete Program'}
              </button>
            )}
          </div>
        </div>

        {/* Side Panel - Program Summary */}
        <div className="w-[480px] bg-[#0f1419] border-l border-[#7DD3C0]/20 overflow-y-auto hidden lg:block">
          <div className="p-6 space-y-6">
            {/* Program Summary Header */}
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Program Summary</h3>
              <p className="text-slate-400 text-sm">Real-time preview of your card program</p>
            </div>

            {/* Card Preview */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-4 font-semibold">Card Preview</div>
              <div className="relative w-full h-48">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 rounded-2xl shadow-2xl transform rotate-2" />
                <div
                  className="absolute inset-0 rounded-2xl shadow-xl border border-slate-600/50 p-6 flex flex-col justify-between"
                  style={{
                    background: getCardBackground(),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-10 rounded bg-gradient-to-br from-yellow-400 to-yellow-600" />
                    <div className="text-right">
                      <div className="text-white font-bold text-lg drop-shadow-lg">ENFUCE</div>
                      <div className="text-slate-200 text-xs drop-shadow">{newProgram.scheme || 'VISA'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-100 font-mono tracking-widest text-lg mb-2 drop-shadow-lg">
                      •••• •••• •••• 4242
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-slate-300 text-xs drop-shadow">CARDHOLDER</div>
                        <div className="text-white text-sm drop-shadow-lg">JOHN DOE</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-300 text-xs drop-shadow">VALID THRU</div>
                        <div className="text-white text-sm drop-shadow-lg">12/28</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Program Details */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 space-y-4">
              <div className="text-sm font-semibold text-slate-300 mb-3">Program Details</div>

              {newProgram.name && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Program Name</div>
                  <div className="text-white font-medium">{newProgram.name}</div>
                </div>
              )}

              {newProgram.type && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Card Type</div>
                  <div className="text-white font-medium capitalize">{newProgram.type}</div>
                </div>
              )}

              {newProgram.scheme && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Card Network</div>
                  <div className="text-white font-medium">{newProgram.scheme}</div>
                </div>
              )}

              {newProgram.targetAudience && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Target Audience</div>
                  <div className="text-white font-medium">{newProgram.targetAudience}</div>
                </div>
              )}

              {newProgram.estimatedCards && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Estimated Cards</div>
                  <div className="text-white font-medium">{newProgram.estimatedCards.toLocaleString()}</div>
                </div>
              )}

              {newProgram.budgetPerCard && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Budget per Card</div>
                  <div className="text-white font-medium">€{newProgram.budgetPerCard}</div>
                </div>
              )}

              {newProgram.features && newProgram.features.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {newProgram.features.map((feature, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#7DD3C0]/20 text-[#7DD3C0] rounded-full text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            {(newProgram.estimatedCards || newProgram.budgetPerCard) && (
              <div className="bg-gradient-to-br from-[#7DD3C0]/10 to-[#FFD93D]/10 rounded-xl p-6 border border-[#7DD3C0]/30">
                <div className="text-sm font-semibold text-[#7DD3C0] mb-4">💰 Estimated Pricing</div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Setup Fee</span>
                    <span className="text-white font-medium">€{pricing.breakdown.setupFee}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Card Production</span>
                    <span className="text-white font-medium">€{Math.round(pricing.breakdown.formFactorCost)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Annual Platform Fee</span>
                    <span className="text-white font-medium">€{Math.round(pricing.breakdown.monthlyFee * 12)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Transaction Fees (Est.)</span>
                    <span className="text-white font-medium">€{Math.round(pricing.breakdown.annualTransactionFees)}</span>
                  </div>

                  <div className="border-t border-[#7DD3C0]/30 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold">Total (First Year)</span>
                      <span className="text-[#FFD93D] font-bold text-xl">€{pricing.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Per Card</div>
                      <div className="text-white font-semibold">€{pricing.perCard}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Monthly</div>
                      <div className="text-white font-semibold">€{pricing.monthly}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-3">Progress</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#7DD3C0] to-[#FFD93D] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(chatStep / (conversationSteps.length - 1)) * 100}%` }}
                  />
                </div>
                <div className="text-white font-semibold text-sm">
                  {Math.round((chatStep / (conversationSteps.length - 1)) * 100)}%
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Step {chatStep + 1} of {conversationSteps.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Wizard modal JSX - defined here to avoid recreation issues
  const renderWizardModal = () => {
    const showLivePricing = pricingVariant === 'live' && wizardStep > 1 && wizardStep < 5;

    return (
      <div className="fixed inset-0 bg-[#2C3E50]/95 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowCreateWizard(false)}>
        <div className={`bg-[#1a2332] sm:rounded-2xl border-0 sm:border-2 border-[#7DD3C0]/30 w-full h-full sm:h-auto ${showLivePricing ? 'sm:max-w-6xl' : 'sm:max-w-3xl'} sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`} onClick={(e) => e.stopPropagation()}>
          <div className="p-4 sm:p-6 border-b border-[#7DD3C0]/20 flex justify-between items-center bg-[#2C3E50]/50">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Create Card Program</h2>
              <p className="text-[#7DD3C0] text-xs sm:text-sm mt-1 hidden sm:block">Configure your new card program</p>
            </div>
            <button
              onClick={() => {setShowCreateWizard(false); setWizardStep(1);}}
              className="text-[#7DD3C0] hover:text-[#FFD93D] text-3xl font-light transition-colors"
            >
              ×
            </button>
          </div>

          <div ref={scrollContainerRef} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
            <div className={`${showLivePricing ? 'lg:flex-1' : 'w-full'}`}>
              <WizardStepIndicator />

              {/* Error Message */}
              {saveStatus.error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="font-semibold text-red-400 mb-1">Failed to Save Configuration</div>
                      <div className="text-sm text-red-300">{saveStatus.error}</div>
                      <button
                        onClick={() => setSaveStatus({ ...saveStatus, error: null })}
                        className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Program Name & Type */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Program Name</label>
                    <input
                      type="text"
                      value={newProgram.name}
                      onChange={(e) => updateProgram({ name: e.target.value })}
                      placeholder="e.g., Executive Travel Card"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                      autoComplete="off"
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
                          onClick={() => updateProgram({ type: type.id })}
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
              )}

              {/* Render other steps (keeping component functions for now to minimize changes) */}
              {wizardStep === 2 && <WizardStep2 />}
              {wizardStep === 3 && <WizardStep3 />}
              {wizardStep === 4 && <WizardStep4 />}
              {wizardStep === 5 && <WizardStep5 />}
            </div>

            {/* Live Pricing Sidebar (for live pricing variants only) */}
            {showLivePricing && (
              <div className="w-full lg:w-80">
                <LivePricingSidebar />
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-[#7DD3C0]/20 flex justify-between bg-[#2C3E50]/30">
            <button
              onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
              className={`px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                wizardStep === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-[#7DD3C0] hover:bg-[#2C3E50] border border-[#7DD3C0]/30'
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
                  // Track purchase (conversion) and save to API
                  trackPurchase();
                  saveConfiguration();
                }
              }}
              disabled={saveStatus.loading}
              className={`px-6 sm:px-8 py-2.5 rounded-lg font-bold transition-all text-sm sm:text-base ${
                wizardStep === 5
                  ? saveStatus.loading
                    ? 'bg-slate-600 text-slate-400 cursor-wait'
                    : 'bg-[#7DD3C0] text-[#2C3E50] hover:bg-[#6BC3B0] shadow-lg'
                  : 'bg-[#FFD93D] text-[#2C3E50] hover:bg-[#FFC700] shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {wizardStep === 5
                ? saveStatus.loading
                  ? '💾 Saving...'
                  : saveStatus.success
                    ? '✅ Saved!'
                    : '🛒 Purchase'
                : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProgramDetail = ({ program }) => (
    <div className="fixed inset-0 bg-[#2C3E50]/95 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-[#1a2332] sm:rounded-2xl border-0 sm:border-2 border-[#7DD3C0]/30 w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-[#7DD3C0]/20 flex justify-between items-center bg-[#2C3E50]/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7DD3C0] to-[#7DD3C0]/60 flex items-center justify-center text-3xl shadow-lg">
              💳
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{program.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={program.status} />
                <span className="text-[#7DD3C0] text-sm font-medium">{program.scheme}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedProgram(null)}
            className="text-[#7DD3C0] hover:text-[#FFD93D] text-3xl font-light transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatsCard icon="💳" label="Active Cards" value={program.cards.toLocaleString()} color="text-[#7DD3C0]" />
            <StatsCard icon="💰" label="Total Spend" value={program.spend} color="text-[#FFD93D]" />
            <StatsCard icon="📊" label="Avg Transaction" value="€47.20" color="text-[#7DD3C0]" />
            <StatsCard icon="🔒" label="Declined" value="2.1%" color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-[#2C3E50]/50 rounded-xl border border-[#7DD3C0]/20 p-4 sm:p-5">
              <h3 className="text-white font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <span className="text-[#7DD3C0]">⚙️</span> Spend Controls
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-slate-400">Daily Limit</span>
                  <span className="text-[#7DD3C0] font-semibold">€500</span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-slate-400">Monthly Limit</span>
                  <span className="text-[#7DD3C0] font-semibold">€5,000</span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-slate-400">Per Transaction</span>
                  <span className="text-[#7DD3C0] font-semibold">€250</span>
                </div>
              </div>
            </div>

            <div className="bg-[#2C3E50]/50 rounded-xl border border-[#7DD3C0]/20 p-4 sm:p-5">
              <h3 className="text-white font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <span className="text-[#7DD3C0]">🏷️</span> Allowed Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {['🍽️ Restaurants', '✈️ Airlines', '🏨 Hotels', '🚕 Transport'].map(cat => (
                  <span key={cat} className="px-2 sm:px-3 py-1 bg-[#7DD3C0]/10 border border-[#7DD3C0]/30 rounded-lg text-xs sm:text-sm text-[#7DD3C0] font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button className="flex-1 py-3 sm:py-3 bg-[#FFD93D] text-[#2C3E50] rounded-lg font-bold hover:bg-[#FFC700] transition-all shadow-md text-sm sm:text-base">
              Edit Configuration
            </button>
            <button className="flex-1 py-3 sm:py-3 bg-[#2C3E50] text-[#7DD3C0] rounded-lg font-semibold hover:bg-[#2C3E50]/80 transition-all border border-[#7DD3C0]/30 text-sm sm:text-base">
              Issue New Card
            </button>
            <button className="flex-1 py-3 sm:py-3 bg-[#2C3E50] text-[#7DD3C0] rounded-lg font-semibold hover:bg-[#2C3E50]/80 transition-all border border-[#7DD3C0]/30 text-sm sm:text-base">
              View Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Overview of your card programs</p>
        </div>
        {/* A/B Test: Show CTA in dashboard only for Variant B (control) */}
        {abTestVariant === 'B' && (
          <button
            onClick={() => handleOpenWizard('dashboard')}
            className="px-4 sm:px-5 py-2.5 bg-[#FFD93D] text-[#2C3E50] rounded-lg font-semibold hover:bg-[#FFC700] transition-all flex items-center gap-2 shadow-lg text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <span>+</span> New Program
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="💳" label="Total Cards" value="4,248" change={12} color="text-[#7DD3C0]" />
        <StatsCard icon="💰" label="Monthly Volume" value="€2.78M" change={8} color="text-[#FFD93D]" />
        <StatsCard icon="📊" label="Active Programs" value="5" color="text-[#7DD3C0]" />
        <StatsCard icon="✅" label="Approval Rate" value="97.8%" change={2} color="text-[#FFD93D]" />
      </div>

      <div className="bg-[#1a2332] backdrop-blur border-2 border-[#7DD3C0]/20 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-[#7DD3C0]/20 flex justify-between items-center bg-[#2C3E50]/30">
          <h2 className="text-lg font-bold text-white">Card Programs</h2>
          <div className="flex gap-2">
            {['All', 'Active', 'Draft'].map(filter => (
              <button
                key={filter}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  filter === 'All'
                    ? 'bg-[#7DD3C0]/20 text-[#7DD3C0] border border-[#7DD3C0]/40'
                    : 'text-slate-400 hover:bg-[#2C3E50] hover:text-[#7DD3C0]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-[#7DD3C0]/10">
          {cardPrograms.map(program => (
            <div
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              className="p-4 sm:p-5 hover:bg-[#2C3E50]/50 cursor-pointer transition-all group"
            >
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#7DD3C0]/20 to-[#7DD3C0]/10 flex items-center justify-center text-xl sm:text-2xl border-2 border-[#7DD3C0]/30 group-hover:border-[#FFD93D]/50 transition-colors flex-shrink-0">
                    💳
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold group-hover:text-[#7DD3C0] transition-colors text-sm sm:text-base truncate">{program.name}</div>
                    <div className="text-slate-400 text-xs sm:text-sm">{program.type} • {program.scheme}</div>
                    <div className="flex items-center gap-3 mt-2 sm:hidden">
                      <div className="text-xs">
                        <span className="text-white font-semibold">{program.cards.toLocaleString()}</span>
                        <span className="text-slate-500 ml-1">Cards</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-white font-semibold">{program.spend}</span>
                        <span className="text-slate-500 ml-1">Vol</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-white font-semibold">{program.cards.toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">Cards</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-white font-semibold">{program.spend}</div>
                    <div className="text-slate-500 text-xs">Volume</div>
                  </div>
                  <StatusBadge status={program.status} />
                  <span className="text-[#7DD3C0] group-hover:text-[#FFD93D] transition-colors hidden sm:inline">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AnalyticsSection = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchAnalytics();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        setAnalyticsData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-400">Loading analytics...</div>
        </div>
      );
    }

    const summary = analyticsData?.summary || {};
    const funnel = analyticsData?.funnel || {};
    const isFallbackMode = analyticsData?.fallback === true;

    // Calculate factor-based analytics for clear decision making
    const calculateFactorImpact = () => {
      // CTA Position: A (Header) vs B (Dashboard)
      const ctaA = {
        impressions: (summary.Alive?.impressions || 0) + (summary.Afinal?.impressions || 0),
        clicks: (summary.Alive?.clicks || 0) + (summary.Afinal?.clicks || 0),
        purchases: (summary.Alive?.purchases || 0) + (summary.Afinal?.purchases || 0)
      };
      const ctaB = {
        impressions: (summary.Blive?.impressions || 0) + (summary.Bfinal?.impressions || 0),
        clicks: (summary.Blive?.clicks || 0) + (summary.Bfinal?.clicks || 0),
        purchases: (summary.Blive?.purchases || 0) + (summary.Bfinal?.purchases || 0)
      };

      // Pricing: Live vs Final
      const pricingLive = {
        impressions: (summary.Alive?.impressions || 0) + (summary.Blive?.impressions || 0),
        clicks: (summary.Alive?.clicks || 0) + (summary.Blive?.clicks || 0),
        purchases: (summary.Alive?.purchases || 0) + (summary.Blive?.purchases || 0)
      };
      const pricingFinal = {
        impressions: (summary.Afinal?.impressions || 0) + (summary.Bfinal?.impressions || 0),
        clicks: (summary.Afinal?.clicks || 0) + (summary.Bfinal?.clicks || 0),
        purchases: (summary.Afinal?.purchases || 0) + (summary.Bfinal?.purchases || 0)
      };

      // Calculate conversion rates
      const ctaARate = ctaA.impressions > 0 ? ((ctaA.purchases / ctaA.impressions) * 100).toFixed(2) : '0.00';
      const ctaBRate = ctaB.impressions > 0 ? ((ctaB.purchases / ctaB.impressions) * 100).toFixed(2) : '0.00';
      const liveRate = pricingLive.impressions > 0 ? ((pricingLive.purchases / pricingLive.impressions) * 100).toFixed(2) : '0.00';
      const finalRate = pricingFinal.impressions > 0 ? ((pricingFinal.purchases / pricingFinal.impressions) * 100).toFixed(2) : '0.00';

      // Wizard type
      const chatWizard = analyticsData?.chatWizard || {};
      const traditionalConversions = chatWizard.traditionalCount || 0;
      const chatConversions = chatWizard.completed || 0;

      const traditionalRate = traditionalConversions > 0 && chatWizard.traditionalCount > 0
        ? ((traditionalConversions / chatWizard.traditionalCount) * 100).toFixed(2)
        : '0.00';
      const chatRate = chatWizard.started > 0
        ? ((chatConversions / chatWizard.started) * 100).toFixed(2)
        : '0.00';

      return {
        cta: {
          A: { ...ctaA, rate: ctaARate },
          B: { ...ctaB, rate: ctaBRate },
          winner: parseFloat(ctaARate) > parseFloat(ctaBRate) ? 'A' : 'B'
        },
        pricing: {
          live: { ...pricingLive, rate: liveRate },
          final: { ...pricingFinal, rate: finalRate },
          winner: parseFloat(liveRate) > parseFloat(finalRate) ? 'live' : 'final'
        },
        wizard: {
          traditional: { conversions: traditionalConversions, rate: traditionalRate },
          chat: { conversions: chatConversions, rate: chatRate, started: chatWizard.started },
          winner: parseFloat(chatRate) > parseFloat(traditionalRate) ? 'chat' : 'traditional'
        }
      };
    };

    const factors = calculateFactorImpact();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">A/B Test Results</h1>
          <p className="text-slate-400 mt-1">Which approach converts better?</p>
        </div>

        {/* Fallback Mode Notice */}
        {isFallbackMode && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl">ℹ️</span>
              <div>
                <div className="text-amber-300 font-medium">Local Development Mode</div>
                <div className="text-sm text-slate-300 mt-1">
                  Vercel Blob storage is not configured. Events are being tracked in your browser's localStorage only.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2">Total Visitors</div>
            <div className="text-3xl font-bold text-white">{funnel.impressions || 0}</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2">CTA Clicks</div>
            <div className="text-3xl font-bold text-cyan-400">{funnel.clicks || 0}</div>
            <div className="text-xs text-slate-500 mt-1">{funnel.clickRate}% click rate</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2">Purchases</div>
            <div className="text-3xl font-bold text-emerald-400">{funnel.purchases || 0}</div>
            <div className="text-xs text-slate-500 mt-1">{funnel.conversionRate}% of clicks</div>
          </div>
        </div>

        {/* CTA Position Test */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">📍 CTA Position Test</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl border-2 ${factors.cta.winner === 'A' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Variant A: Header</div>
                {factors.cta.winner === 'A' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.cta.A.rate}%</div>
              <div className="text-sm text-slate-400">Conversion Rate</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Visitors</div>
                  <div className="text-white font-medium">{factors.cta.A.impressions}</div>
                </div>
                <div>
                  <div className="text-slate-500">Clicks</div>
                  <div className="text-white font-medium">{factors.cta.A.clicks}</div>
                </div>
                <div>
                  <div className="text-slate-500">Purchases</div>
                  <div className="text-white font-medium">{factors.cta.A.purchases}</div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${factors.cta.winner === 'B' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Variant B: Dashboard</div>
                {factors.cta.winner === 'B' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.cta.B.rate}%</div>
              <div className="text-sm text-slate-400">Conversion Rate</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Visitors</div>
                  <div className="text-white font-medium">{factors.cta.B.impressions}</div>
                </div>
                <div>
                  <div className="text-slate-500">Clicks</div>
                  <div className="text-white font-medium">{factors.cta.B.clicks}</div>
                </div>
                <div>
                  <div className="text-slate-500">Purchases</div>
                  <div className="text-white font-medium">{factors.cta.B.purchases}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Display Test */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">💰 Pricing Display Test</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl border-2 ${factors.pricing.winner === 'live' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Dynamic Pricing</div>
                {factors.pricing.winner === 'live' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.pricing.live.rate}%</div>
              <div className="text-sm text-slate-400">Conversion Rate</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Visitors</div>
                  <div className="text-white font-medium">{factors.pricing.live.impressions}</div>
                </div>
                <div>
                  <div className="text-slate-500">Clicks</div>
                  <div className="text-white font-medium">{factors.pricing.live.clicks}</div>
                </div>
                <div>
                  <div className="text-slate-500">Purchases</div>
                  <div className="text-white font-medium">{factors.pricing.live.purchases}</div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${factors.pricing.winner === 'final' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Final Price Only</div>
                {factors.pricing.winner === 'final' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.pricing.final.rate}%</div>
              <div className="text-sm text-slate-400">Conversion Rate</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Visitors</div>
                  <div className="text-white font-medium">{factors.pricing.final.impressions}</div>
                </div>
                <div>
                  <div className="text-slate-500">Clicks</div>
                  <div className="text-white font-medium">{factors.pricing.final.clicks}</div>
                </div>
                <div>
                  <div className="text-slate-500">Purchases</div>
                  <div className="text-white font-medium">{factors.pricing.final.purchases}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Type Test */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">🤖 Wizard Type Test</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl border-2 ${factors.wizard.winner === 'traditional' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Traditional Wizard</div>
                {factors.wizard.winner === 'traditional' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.wizard.traditional.rate}%</div>
              <div className="text-sm text-slate-400">Completion Rate</div>
              <div className="mt-4">
                <div className="text-slate-500 text-xs">Completions</div>
                <div className="text-white font-medium">{factors.wizard.traditional.conversions}</div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${factors.wizard.winner === 'chat' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-white">Chat Wizard</div>
                {factors.wizard.winner === 'chat' && <span className="text-emerald-400 text-2xl">👑</span>}
              </div>
              <div className="text-4xl font-bold text-white mb-2">{factors.wizard.chat.rate}%</div>
              <div className="text-sm text-slate-400">Completion Rate</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Started</div>
                  <div className="text-white font-medium">{factors.wizard.chat.started}</div>
                </div>
                <div>
                  <div className="text-slate-500">Completed</div>
                  <div className="text-white font-medium">{factors.wizard.chat.conversions}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Variant Breakdown (Collapsible) */}
        <details className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <summary className="text-lg font-semibold text-white cursor-pointer hover:text-cyan-400">📊 View Detailed Variant Breakdown</summary>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {Object.entries(summary).map(([variant, data]) => {
              const variantName = {
                'Alive': 'Header + Dynamic Pricing',
                'Afinal': 'Header + Final Pricing',
                'Blive': 'Dashboard + Dynamic Pricing',
                'Bfinal': 'Dashboard + Final Pricing'
              }[variant] || variant;

              return (
                <div key={variant} className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
                  <h3 className="text-white font-semibold mb-4">{variantName}</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Visitors</span>
                      <span className="text-white font-medium">{data.impressions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Clicks</span>
                      <span className="text-white font-medium">{data.clicks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Purchases</span>
                      <span className="text-white font-medium">{data.purchases}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Overall CVR</span>
                        <span className="text-emerald-400 font-semibold">{data.overallConversionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {/* Refresh Button */}
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all border border-cyan-500/30"
        >
          Refresh Data
        </button>
      </div>
    );
  };

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
    <div className="min-h-screen bg-[#2C3E50] flex flex-col lg:flex-row" style={{fontFamily: "'Inter', system-ui, sans-serif"}}>
      <SideNav />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 bg-[#2C3E50]/95 backdrop-blur-xl border-b border-[#7DD3C0]/20 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 z-10">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search..."
                className="w-full sm:w-60 lg:w-80 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
            {/* A/B Test: Show CTA in header for Variant A */}
            {abTestVariant === 'A' && (
              <button
                onClick={() => handleOpenWizard('header')}
                className="px-4 sm:px-5 py-2.5 bg-[#FFD93D] text-[#2C3E50] rounded-lg font-semibold hover:bg-[#FFC700] transition-all flex items-center gap-2 shadow-lg text-sm sm:text-base"
              >
                <span>+</span> <span className="hidden sm:inline">New Program</span><span className="sm:hidden">New</span>
              </button>
            )}
            <button className="p-2 text-slate-400 hover:text-white relative flex-shrink-0">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                UN
              </div>
              <div className="text-xs sm:text-sm hidden sm:block">
                <div className="text-white font-medium">Maria Chen</div>
                <div className="text-slate-500 text-xs">Program Administrator</div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="p-4 sm:p-6 lg:p-8">
          {activeSection === 'dashboard' && <Dashboard />}
          {activeSection === 'programs' && <Dashboard />}
          {activeSection === 'analytics' && <AnalyticsSection />}
          {activeSection === 'api' && <APISection />}
          {activeSection !== 'dashboard' && activeSection !== 'programs' && activeSection !== 'analytics' && activeSection !== 'api' && (
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
      
      {showCreateWizard && (wizardVariant === 'chat' ? renderChatWizard() : renderWizardModal())}
      {selectedProgram && <ProgramDetail program={selectedProgram} />}
    </div>
  );
};

export default EnfucePortal;
