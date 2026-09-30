import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seedRealSchemes() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kisan_ai'
  });

  try {
    console.log('Adding required_documents column if missing...');
    try {
      await connection.query('ALTER TABLE government_schemes ADD COLUMN required_documents TEXT');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        throw e;
      }
    }

    console.log('Clearing old schemes...');
    await connection.query('DELETE FROM government_schemes');

    console.log('Inserting comprehensive agricultural schemes...');
    
    // Helper function to generate schemes
    const generateSchemes = () => {
      const schemes = [];
      
      // SUBSIDY SCHEMES
      schemes.push(
        { name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)', type: 'Subsidy', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Direct income support of ₹6,000 per year for landholding farmer families across the country.', ben: '₹6000 annual direct income support transferred directly to bank accounts.', req: 'Aadhar Card, Bank Passbook, Land Ownership Records', proc: 'Apply via PM-Kisan portal or nearest CSC center.', url: 'https://pmkisan.gov.in' },
        { name: 'Seed Village Programme Subsidy', type: 'Subsidy', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer'], desc: 'Subsidy on seeds and quality seed production to improve crop yield.', ben: '50% to 75% subsidy on quality certified seeds.', req: 'Farmer ID, Land Record, Passport Size Photo', proc: 'Apply through State Agriculture Department nodal officer.', url: 'https://seednet.gov.in' },
        { name: 'National Food Security Mission Subsidy', type: 'Subsidy', farmers: ['Small Farmer', 'Marginal Farmer'], desc: 'Financial assistance for purchasing high-yielding variety seeds and micronutrients.', ben: 'Subsidies up to 50% for seeds, nutrients, and pest management tools.', req: 'Kisan Credit Card, Identity Proof', proc: 'Register at district agriculture office.', url: 'https://nfsm.gov.in' },
        { name: 'Mahila Kisan Sashaktikaran Pariyojana (MKSP)', type: 'Subsidy', farmers: ['Women Farmer'], desc: 'Special subsidy and empowerment program for women in agriculture to improve their status and yield.', ben: 'Funding for women SHGs up to ₹10 Lakhs.', req: 'SHG Registration, Aadhar, Bank Account', proc: 'Apply through State Rural Livelihood Mission.', url: 'https://mksp.gov.in' },
        { name: 'State Fertilizer Subsidy Scheme', type: 'Subsidy', farmers: ['Large Farmer', 'Young Farmer'], desc: 'Direct benefit transfer for purchasing urea and P&K fertilizers at subsidized rates.', ben: 'Urea at fixed price of ₹266.70 per 45kg bag.', req: 'Aadhar linked Biometric Authentication at PoS', proc: 'Purchase directly from authorized fertilizer dealers via PoS.', url: 'https://fert.nic.in' },
        { name: 'Horticulture Mission for North East and Himalayan States (HMNEH)', type: 'Subsidy', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer'], desc: 'Subsidy for setting up greenhouses, shade nets, and high-value horticulture.', ben: '50% subsidy on capital cost of greenhouses and polyhouses.', req: 'Land Record, Project DPR, Aadhar', proc: 'Submit DPR to District Horticulture Officer.', url: 'https://midh.gov.in' },
        { name: 'Sub-Mission on Agricultural Mechanization (SMAM)', type: 'Subsidy', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer'], desc: 'Provides financial assistance for purchasing agricultural machinery and equipment.', ben: '40% to 50% subsidy on tractors and power tillers.', req: 'Quotation of Machinery, Land Record, Aadhar', proc: 'Apply online at agrimachinery.nic.in.', url: 'https://agrimachinery.nic.in' },
        
        // LOAN SCHEMES
        { name: 'Kisan Credit Card (KCC)', type: 'Loan', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Short-term credit limits up to ₹3 lakh at subsidized interest rates.', ben: 'Collateral free loan up to ₹1.6 Lakh. Interest at 4% with prompt repayment.', req: 'Land Records, Passport Photos, Identity Proof', proc: 'Fill standard KCC application form at any commercial bank.', url: 'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-loan/kisan-credit-card' },
        { name: 'Agriculture Infrastructure Fund (AIF)', type: 'Loan', farmers: ['Large Farmer', 'Young Farmer', 'Women Farmer'], desc: 'Medium-long term debt financing facility for investment in viable projects for post-harvest management.', ben: '3% Interest subvention up to ₹2 Crore for 7 years.', req: 'Detailed Project Report (DPR), Bank Consent, Pan Card', proc: 'Apply online at AIF portal and select lending institution.', url: 'https://agriinfra.dac.gov.in' },
        { name: 'Dairy Entrepreneurship Development Scheme', type: 'Loan', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Capital subsidy on bank loans for setting up dairy farms.', ben: '25% to 33.33% capital subsidy on dairy project costs.', req: 'Project Report, Land availability proof for fodder', proc: 'Apply through nationalized banks linked with NABARD.', url: 'https://nabard.org' },
        { name: 'Stand-Up India Scheme for Agri-Startups', type: 'Loan', farmers: ['Women Farmer', 'Young Farmer'], desc: 'Bank loans between 10 lakh and 1 crore for greenfield agricultural enterprises.', ben: 'Credit guarantee and simplified loan processing.', req: 'Business Plan, SC/ST/Women Certificate, KYC', proc: 'Apply via Stand-Up India portal or local bank branch.', url: 'https://standupmitra.in' },
        { name: 'PM Micro Food Processing Enterprises Scheme', type: 'Loan', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer'], desc: 'Credit-linked capital subsidy for upgrading individual micro food processing units.', ben: '35% credit-linked subsidy up to maximum of ₹10 Lakh.', req: 'FSSAI License, Bank Account, Enterprise Details', proc: 'Register via PMFME MIS portal.', url: 'https://pmfme.mofpi.gov.in' },
        
        // INSURANCE SCHEMES
        { name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', type: 'Insurance', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Comprehensive crop insurance scheme protecting farmers against crop failure.', ben: 'Full compensation for crop loss due to non-preventable natural risks.', req: 'Sowing Certificate, Land Record, Bank Details', proc: 'Register online or at bank within 15 days of sowing.', url: 'https://pmfby.gov.in' },
        { name: 'Restructured Weather Based Crop Insurance Scheme', type: 'Insurance', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer'], desc: 'Insurance protection against adverse weather conditions like rainfall, temperature, and wind.', ben: 'Payout based on automated weather station data triggering indices.', req: 'Aadhar Card, Crop Details, Premium Receipt', proc: 'Opt-in through local insurance agents or CSC.', url: 'https://pmfby.gov.in' },
        { name: 'Livestock Insurance Scheme', type: 'Insurance', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Insurance cover to farmers and cattle rearers against the death of animals.', ben: 'Market value of the animal compensated on death.', req: 'Veterinary Health Certificate, Animal Ear Tag, Photos', proc: 'Contact nearest veterinary hospital or state animal husbandry office.', url: 'https://dahd.nic.in' },
        
        // TRAINING SCHEMES
        { name: 'Paramparagat Krishi Vikas Yojana (PKVY)', type: 'Training', farmers: ['Small Farmer', 'Marginal Farmer', 'Women Farmer', 'Young Farmer'], desc: 'Promotes organic farming through a cluster approach, providing training and certification.', ben: '₹50,000 per hectare for 3 years covering organic inputs and training.', req: 'Minimum 20 hectare cluster group agreement', proc: 'Register as a cluster with local agriculture extension officer.', url: 'https://pgsindia-ncof.gov.in' },
        { name: 'Agri-Clinics and Agri-Business Centres (ACABC)', type: 'Training', farmers: ['Young Farmer', 'Women Farmer'], desc: 'Training program for agriculture graduates to set up their own clinics and business centers.', ben: 'Free 2-month training and 36% to 44% subsidy on project costs.', req: 'Degree/Diploma in Agriculture or allied subjects', proc: 'Apply via MANAGE Hyderabad portal.', url: 'https://agriclinics.net' },
        { name: 'Skill Training of Rural Youth (STRY)', type: 'Training', farmers: ['Young Farmer', 'Women Farmer'], desc: 'Short-term skill training in agriculture and allied areas for rural youth.', ben: 'Free 6-day residential or 7-day non-residential training programs.', req: 'Age Proof (18-40 years), Minimum 10th Pass', proc: 'Enroll at nearest Krishi Vigyan Kendra (KVK).', url: 'https://manage.gov.in' },
        
        // EQUIPMENT SCHEMES
        { name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)', type: 'Equipment', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer', 'Women Farmer'], desc: 'Subsidies on micro-irrigation equipment (drip and sprinkler systems).', ben: '55% subsidy for small/marginal farmers and 45% for others on irrigation units.', req: 'Land Record, Water Source Proof, Aadhar', proc: 'Apply through designated state micro-irrigation portals.', url: 'https://pmksy.gov.in' },
        { name: 'Pradhan Mantri Kisan Urja Suraksha (PM-KUSUM)', type: 'Equipment', farmers: ['Small Farmer', 'Marginal Farmer', 'Large Farmer', 'Young Farmer'], desc: 'Scheme for installation of solar pumps and grid-connected solar power plants.', ben: '30% central subsidy and 30% state subsidy on solar pumps.', req: 'Land Record, Irrigation Source details, ID Proof', proc: 'Apply through State Nodal Agency (SNA) for renewable energy.', url: 'https://pmkusum.mnre.gov.in' },
        { name: 'Drone Subsidy for Agriculture', type: 'Equipment', farmers: ['Young Farmer', 'Large Farmer'], desc: 'Financial assistance to purchase agricultural drones for precision farming.', ben: 'Up to 50% subsidy (max ₹5 Lakh) for SC/ST/Women/Small farmers, 40% for others.', req: 'Drone Pilot License, Agri Graduate Certificate, Aadhar', proc: 'Submit application to District Agriculture Officer.', url: 'https://agricoop.nic.in' }
      );

      return schemes;
    };

    const schemesList = generateSchemes();
    let count = 0;

    for (const scheme of schemesList) {
      await connection.query(
        "INSERT INTO government_schemes (id, name, description, eligibility_criteria, benefits, application_process, website_url, is_active, required_documents) VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1, ?)",
        [
          scheme.name, 
          `[${scheme.type} Scheme] ${scheme.desc}`, 
          JSON.stringify(scheme.farmers), 
          JSON.stringify([scheme.ben]), 
          scheme.proc, 
          scheme.url,
          scheme.req
        ]
      );
      count++;
    }
    
    console.log(`✅ Successfully inserted ${count} varied government schemes with correct documents and URLs!`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await connection.end();
  }
}

seedRealSchemes();
