import { DataProfile, PipelineConfig } from '../types/studio';

export interface SampleDatasetMeta {
  id: string;
  name: string;
  filename: string;
  taskType: 'classification' | 'regression';
  targetColumn: string;
  defaultDropColumns: string[];
  description: string;
  rowsCount: number;
  colsCount: number;
  badge: string;
  pythonGeneratorCode: string;
  initialProfile: DataProfile;
}

export const SAMPLE_DATASETS: SampleDatasetMeta[] = [
  {
    id: 'telco_churn',
    name: 'Telco Customer Churn (Classification)',
    filename: 'telco_customer_churn.csv',
    taskType: 'classification',
    targetColumn: 'Churn',
    defaultDropColumns: ['CustomerID'],
    description:
      'Dự đoán khách hàng rời bỏ dịch vụ viễn thông (600 dòng, có Missing Values ở TotalCharges & Income, dữ liệu mất cân bằng ~26% Churn).',
    rowsCount: 600,
    colsCount: 11,
    badge: 'Imbalanced + NaNs',
    pythonGeneratorCode: `
# Khởi tạo dữ liệu mẫu chuẩn thực tế: Telco Customer Churn (600 mẫu)
rng = np.random.RandomState(42)
n_samples = 600
tenure = rng.randint(1, 72, size=n_samples).astype(float)
monthly_charges = np.round(rng.uniform(19.5, 118.5, size=n_samples), 2)
total_charges = np.round(tenure * monthly_charges + rng.normal(0, 45, size=n_samples), 2)
age = rng.randint(19, 78, size=n_samples).astype(float)
support_calls = rng.poisson(1.8, size=n_samples).astype(float)

contract = rng.choice(['Month-to-month', 'One year', 'Two year'], size=n_samples, p=[0.55, 0.25, 0.20])
internet = rng.choice(['Fiber optic', 'DSL', 'No'], size=n_samples, p=[0.46, 0.34, 0.20])
payment = rng.choice(['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card'], size=n_samples, p=[0.36, 0.22, 0.21, 0.21])
tech_support = rng.choice(['No', 'Yes'], size=n_samples, p=[0.62, 0.38])

# Tạo xác suất rời mạng (Churn) phi tuyến theo nghiệp vụ thực tế
logit = (
    -1.45
    + 1.35 * (contract == 'Month-to-month').astype(float)
    - 0.95 * (contract == 'Two year').astype(float)
    + 0.85 * (internet == 'Fiber optic').astype(float)
    + 0.55 * (payment == 'Electronic check').astype(float)
    - 0.65 * (tech_support == 'Yes').astype(float)
    - 0.032 * tenure
    + 0.014 * monthly_charges
    + 0.28 * support_calls
    + rng.normal(0, 0.55, size=n_samples)
)
prob = 1.0 / (1.0 + np.exp(-logit))
churn = (prob > 0.54).astype(int)

# Cài cắm Missing Values (NaN) thực tế để kiểm chứng Anti-Leakage Imputer
total_charges[rng.choice(n_samples, 38, replace=False)] = np.nan
age[rng.choice(n_samples, 24, replace=False)] = np.nan
tech_support_obj = tech_support.astype(object)
tech_support_obj[rng.choice(n_samples, 19, replace=False)] = None

df = pd.DataFrame({
    'CustomerID': [f'CUST-{10000+i}' for i in range(n_samples)],
    'Tenure_Months': tenure,
    'Monthly_Charges': monthly_charges,
    'Total_Charges': total_charges,
    'Age': age,
    'Support_Calls': support_calls,
    'Contract_Type': contract,
    'Internet_Service': internet,
    'Payment_Method': payment,
    'Tech_Support': tech_support_obj,
    'Churn': churn
})
DATASET_NAME = 'telco_customer_churn.csv'
`.trim(),
    initialProfile: {
      dataset_name: 'telco_customer_churn.csv',
      shape: [600, 11],
      memory_mb: 0.14,
      columns: [
        { name: 'CustomerID', dtype: 'object', inferred_type: 'text_or_id', missing_pct: 0.0, nunique: 600, top_values: { 'CUST-10000': 1, 'CUST-10001': 1 } },
        { name: 'Tenure_Months', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 71, mean: 35.8, std: 20.4, min: 1, max: 71 },
        { name: 'Monthly_Charges', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 542, mean: 68.9, std: 28.5, min: 19.6, max: 118.4 },
        { name: 'Total_Charges', dtype: 'float64', inferred_type: 'numeric', missing_pct: 6.33, nunique: 558, mean: 2472.4, std: 1840.2, min: 20.5, max: 8320.1 },
        { name: 'Age', dtype: 'float64', inferred_type: 'numeric', missing_pct: 4.0, nunique: 59, mean: 48.2, std: 16.9, min: 19, max: 77 },
        { name: 'Support_Calls', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 8, mean: 1.81, std: 1.34, min: 0, max: 7 },
        { name: 'Contract_Type', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 3, top_values: { 'Month-to-month': 332, 'One year': 148, 'Two year': 120 } },
        { name: 'Internet_Service', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 3, top_values: { 'Fiber optic': 276, 'DSL': 204, 'No': 120 } },
        { name: 'Payment_Method', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 4, top_values: { 'Electronic check': 216, 'Mailed check': 132, 'Bank transfer': 126, 'Credit card': 126 } },
        { name: 'Tech_Support', dtype: 'object', inferred_type: 'categorical', missing_pct: 3.17, nunique: 2, top_values: { 'No': 360, 'Yes': 221 } },
        { name: 'Churn', dtype: 'int64', inferred_type: 'binary', missing_pct: 0.0, nunique: 2, mean: 0.275, std: 0.44, min: 0, max: 1 },
      ],
      head: [
        { CustomerID: 'CUST-10000', Tenure_Months: 52, Monthly_Charges: 84.2, Total_Charges: 4378.4, Age: 44, Support_Calls: 1, Contract_Type: 'Month-to-month', Internet_Service: 'Fiber optic', Payment_Method: 'Electronic check', Tech_Support: 'No', Churn: 1 },
        { CustomerID: 'CUST-10001', Tenure_Months: 15, Monthly_Charges: 53.1, Total_Charges: 796.5, Age: 31, Support_Calls: 3, Contract_Type: 'Month-to-month', Internet_Service: 'DSL', Payment_Method: 'Mailed check', Tech_Support: 'No', Churn: 1 },
        { CustomerID: 'CUST-10002', Tenure_Months: 61, Monthly_Charges: 39.8, Total_Charges: 2427.8, Age: 58, Support_Calls: 0, Contract_Type: 'Two year', Internet_Service: 'DSL', Payment_Method: 'Bank transfer', Tech_Support: 'Yes', Churn: 0 },
        { CustomerID: 'CUST-10003', Tenure_Months: 21, Monthly_Charges: 95.4, Total_Charges: null, Age: 29, Support_Calls: 2, Contract_Type: 'Month-to-month', Internet_Service: 'Fiber optic', Payment_Method: 'Electronic check', Tech_Support: 'No', Churn: 1 },
        { CustomerID: 'CUST-10004', Tenure_Months: 48, Monthly_Charges: 64.0, Total_Charges: 3072.0, Age: 51, Support_Calls: 1, Contract_Type: 'One year', Internet_Service: 'Fiber optic', Payment_Method: 'Credit card', Tech_Support: 'Yes', Churn: 0 },
      ],
    },
  },
  {
    id: 'credit_fraud_risk',
    name: 'Credit Loan Default Risk (Classification)',
    filename: 'credit_loan_default.csv',
    taskType: 'classification',
    targetColumn: 'Default_Risk',
    defaultDropColumns: ['Loan_ID'],
    description:
      'Chấm điểm rủi ro vỡ nợ tín dụng ngân hàng (650 hồ sơ, gồm Thu nhập, Điểm tín dụng FICO, Tỷ lệ nợ DTI, Mục đích vay).',
    rowsCount: 650,
    colsCount: 10,
    badge: 'FinTech Benchmark',
    pythonGeneratorCode: `
rng = np.random.RandomState(108)
n_samples = 650
annual_income = np.round(rng.lognormal(mean=11.05, sigma=0.48, size=n_samples), 0)
loan_amount = np.round(rng.uniform(3500, 45000, size=n_samples), 0)
dti_ratio = np.round(rng.uniform(4.5, 42.0, size=n_samples), 2)
fico_score = np.round(rng.normal(685, 58, size=n_samples)).clip(500, 850)
delinq_2yrs = rng.poisson(0.45, size=n_samples).astype(float)

home_ownership = rng.choice(['MORTGAGE', 'RENT', 'OWN'], size=n_samples, p=[0.47, 0.41, 0.12])
loan_purpose = rng.choice(['debt_consolidation', 'credit_card', 'small_business', 'home_improvement'], size=n_samples, p=[0.48, 0.26, 0.14, 0.12])
emp_length = rng.choice(['< 1 year', '1-3 years', '4-7 years', '8+ years'], size=n_samples, p=[0.18, 0.28, 0.26, 0.28])

score_logit = (
    2.4
    - 0.0085 * fico_score
    + 0.068 * dti_ratio
    + 0.48 * delinq_2yrs
    + 0.000038 * loan_amount
    - 0.000012 * annual_income
    + 0.65 * (loan_purpose == 'small_business').astype(float)
    + 0.35 * (home_ownership == 'RENT').astype(float)
    + rng.normal(0, 0.5, size=n_samples)
)
default_risk = (1.0 / (1.0 + np.exp(-score_logit)) > 0.48).astype(int)

fico_score[rng.choice(n_samples, 32, replace=False)] = np.nan
annual_income[rng.choice(n_samples, 25, replace=False)] = np.nan

df = pd.DataFrame({
    'Loan_ID': [f'LN-{80000+i}' for i in range(n_samples)],
    'Annual_Income': annual_income,
    'Loan_Amount': loan_amount,
    'DTI_Ratio': dti_ratio,
    'FICO_Score': fico_score,
    'Delinq_2Yrs': delinq_2yrs,
    'Home_Ownership': home_ownership,
    'Loan_Purpose': loan_purpose,
    'Emp_Length': emp_length,
    'Default_Risk': default_risk
})
DATASET_NAME = 'credit_loan_default.csv'
`.trim(),
    initialProfile: {
      dataset_name: 'credit_loan_default.csv',
      shape: [650, 10],
      memory_mb: 0.13,
      columns: [
        { name: 'Loan_ID', dtype: 'object', inferred_type: 'text_or_id', missing_pct: 0.0, nunique: 650 },
        { name: 'Annual_Income', dtype: 'float64', inferred_type: 'numeric', missing_pct: 3.85, nunique: 615, mean: 70420, std: 35100, min: 18500, max: 245000 },
        { name: 'Loan_Amount', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 620, mean: 24120, std: 11890, min: 3510, max: 44980 },
        { name: 'DTI_Ratio', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 580, mean: 23.1, std: 10.6, min: 4.5, max: 41.9 },
        { name: 'FICO_Score', dtype: 'float64', inferred_type: 'numeric', missing_pct: 4.92, nunique: 210, mean: 684.5, std: 56.4, min: 512, max: 845 },
        { name: 'Delinq_2Yrs', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 5, mean: 0.45, std: 0.67, min: 0, max: 4 },
        { name: 'Home_Ownership', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 3, top_values: { MORTGAGE: 305, RENT: 266, OWN: 79 } },
        { name: 'Loan_Purpose', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 4, top_values: { debt_consolidation: 312, credit_card: 169, small_business: 91, home_improvement: 78 } },
        { name: 'Emp_Length', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 4, top_values: { '1-3 years': 182, '8+ years': 182, '4-7 years': 169, '< 1 year': 117 } },
        { name: 'Default_Risk', dtype: 'int64', inferred_type: 'binary', missing_pct: 0.0, nunique: 2, mean: 0.24, std: 0.42, min: 0, max: 1 },
      ],
      head: [
        { Loan_ID: 'LN-80000', Annual_Income: 68400, Loan_Amount: 18500, DTI_Ratio: 19.4, FICO_Score: 712, Delinq_2Yrs: 0, Home_Ownership: 'MORTGAGE', Loan_Purpose: 'debt_consolidation', Emp_Length: '4-7 years', Default_Risk: 0 },
        { Loan_ID: 'LN-80001', Annual_Income: 42100, Loan_Amount: 31200, DTI_Ratio: 34.8, FICO_Score: 615, Delinq_2Yrs: 2, Home_Ownership: 'RENT', Loan_Purpose: 'small_business', Emp_Length: '< 1 year', Default_Risk: 1 },
      ],
    },
  },
  {
    id: 'real_estate_valuation',
    name: 'Smart Housing Valuation (Regression)',
    filename: 'smart_housing_valuation.csv',
    taskType: 'regression',
    targetColumn: 'Price_USD_k',
    defaultDropColumns: ['Property_ID'],
    description:
      'Dự báo giá bất động sản liên tục (550 căn hộ, kết hợp biến số diện tích, thu nhập khu vực, khoảng cách trung tâm và phân loại vùng).',
    rowsCount: 550,
    colsCount: 9,
    badge: 'Regression Task',
    pythonGeneratorCode: `
rng = np.random.RandomState(2026)
n_samples = 550
living_area_sqm = np.round(rng.uniform(42, 260, size=n_samples), 1)
median_income_k = np.round(rng.uniform(32, 165, size=n_samples), 1)
property_age = rng.randint(1, 55, size=n_samples).astype(float)
dist_center_km = np.round(rng.exponential(scale=8.5, size=n_samples).clip(0.8, 42.0), 2)
bedrooms = rng.randint(1, 6, size=n_samples).astype(float)

zone_type = rng.choice(['Downtown_Core', 'Suburban_Tech', 'Waterfront', 'Outer_Ring'], size=n_samples, p=[0.25, 0.35, 0.15, 0.25])
condition = rng.choice(['Luxury_Renovated', 'Good', 'Standard'], size=n_samples, p=[0.22, 0.50, 0.28])

zone_bonus = np.where(zone_type == 'Waterfront', 145.0, np.where(zone_type == 'Downtown_Core', 95.0, np.where(zone_type == 'Suburban_Tech', 45.0, 0.0)))
cond_bonus = np.where(condition == 'Luxury_Renovated', 68.0, np.where(condition == 'Good', 22.0, 0.0))

price_usd_k = np.round(
    85.0
    + 2.35 * living_area_sqm
    + 1.85 * median_income_k
    - 1.45 * property_age
    - 4.80 * dist_center_km
    + 14.5 * bedrooms
    + zone_bonus
    + cond_bonus
    + rng.normal(0, 24.0, size=n_samples),
    2
)

living_area_sqm[rng.choice(n_samples, 28, replace=False)] = np.nan
dist_center_km[rng.choice(n_samples, 20, replace=False)] = np.nan

df = pd.DataFrame({
    'Property_ID': [f'PROP-{5000+i}' for i in range(n_samples)],
    'Living_Area_Sqm': living_area_sqm,
    'Median_Income_k': median_income_k,
    'Property_Age_Yrs': property_age,
    'Dist_Center_Km': dist_center_km,
    'Bedrooms': bedrooms,
    'Zone_Type': zone_type,
    'Condition': condition,
    'Price_USD_k': price_usd_k
})
DATASET_NAME = 'smart_housing_valuation.csv'
`.trim(),
    initialProfile: {
      dataset_name: 'smart_housing_valuation.csv',
      shape: [550, 9],
      memory_mb: 0.11,
      columns: [
        { name: 'Property_ID', dtype: 'object', inferred_type: 'text_or_id', missing_pct: 0.0, nunique: 550 },
        { name: 'Living_Area_Sqm', dtype: 'float64', inferred_type: 'numeric', missing_pct: 5.09, nunique: 460, mean: 151.4, std: 62.1, min: 42.3, max: 259.8 },
        { name: 'Median_Income_k', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 475, mean: 98.2, std: 38.4, min: 32.1, max: 164.8 },
        { name: 'Property_Age_Yrs', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 54, mean: 27.6, std: 15.6, min: 1, max: 54 },
        { name: 'Dist_Center_Km', dtype: 'float64', inferred_type: 'numeric', missing_pct: 3.64, nunique: 410, mean: 8.6, std: 7.4, min: 0.8, max: 41.2 },
        { name: 'Bedrooms', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 5, mean: 3.0, std: 1.4, min: 1, max: 5 },
        { name: 'Zone_Type', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 4, top_values: { Suburban_Tech: 192, Downtown_Core: 138, Outer_Ring: 138, Waterfront: 82 } },
        { name: 'Condition', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 3, top_values: { Good: 275, Standard: 154, Luxury_Renovated: 121 } },
        { name: 'Price_USD_k', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 545, mean: 642.5, std: 185.3, min: 210.4, max: 1180.2 },
      ],
      head: [
        { Property_ID: 'PROP-5000', Living_Area_Sqm: 168.5, Median_Income_k: 112.4, Property_Age_Yrs: 12, Dist_Center_Km: 5.4, Bedrooms: 3, Zone_Type: 'Downtown_Core', Condition: 'Good', Price_USD_k: 784.2 },
        { Property_ID: 'PROP-5001', Living_Area_Sqm: 94.0, Median_Income_k: 68.0, Property_Age_Yrs: 28, Dist_Center_Km: 14.2, Bedrooms: 2, Zone_Type: 'Outer_Ring', Condition: 'Standard', Price_USD_k: 365.8 },
      ],
    },
  },
];

export function createDefaultPipelineConfig(sampleId = 'telco_churn'): PipelineConfig {
  const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId) || SAMPLE_DATASETS[0];
  const numericCols = sample.initialProfile.columns
    .filter(
      (c) =>
        c.name !== sample.targetColumn &&
        !sample.defaultDropColumns.includes(c.name) &&
        (c.inferred_type === 'numeric' || c.inferred_type === 'binary')
    )
    .map((c) => c.name);

  const categoricalCols = sample.initialProfile.columns
    .filter(
      (c) =>
        c.name !== sample.targetColumn &&
        !sample.defaultDropColumns.includes(c.name) &&
        c.inferred_type === 'categorical'
    )
    .map((c) => c.name);

  return {
    datasetSource: 'sample',
    sampleDatasetId: sample.id,
    uploadedFileName: '',
    cloudDatasetUrl: '',
    targetColumn: sample.targetColumn,
    taskType: sample.taskType,
    dropColumns: [...sample.defaultDropColumns],
    numericColumns: numericCols,
    categoricalColumns: categoricalCols,

    numericImputer: 'median',
    numericScaler: 'robust',
    addMissingIndicator: true,
    categoricalImputer: 'most_frequent',
    categoricalEncoder: 'onehot',
    maxOneHotCategories: 20,

    testSize: 0.2,
    cvFolds: 5,
    stratifiedCV: sample.taskType === 'classification',
    imbalanceStrategy: sample.taskType === 'classification' ? 'class_weight' : 'none',

    modelFamily: 'HistGradientBoosting',
    hyperparameters: {
      nEstimators: 150,
      learningRate: 0.06,
      maxDepth: 6,
      minSamplesLeaf: 15,
      l2Regularization: 1.0,
      subsample: 0.85,
      randomState: 42,
    },
  };
}
