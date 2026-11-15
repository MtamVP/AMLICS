import { LessonDatasetSpec } from '../types/curriculum';

export const CURRICULUM_DATASETS: Record<string, LessonDatasetSpec> = {
  titanic: {
    id: 'titanic',
    fileName: 'titanic.csv',
    title: 'Titanic Passengers (Phân loại nhị phân)',
    description:
      'Hồ sơ 300 hành khách tàu Titanic với tuổi thiếu (NaN), hạng vé, giá vé lệch phải và nhãn Survived (0/1).',
    rows: 300,
    cols: 9,
    targetColumn: 'Survived',
    columnsSummary: ['PassengerId', 'Pclass', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare', 'Embarked', 'Survived'],
    generatorPython: `
def _gen_titanic():
    rng = np.random.RandomState(42)
    n = 300
    pclass = rng.choice([1, 2, 3], size=n, p=[0.24, 0.22, 0.54])
    sex = rng.choice(['male', 'female'], size=n, p=[0.63, 0.37])
    age = np.round(rng.normal(30, 13, size=n).clip(1, 78), 1).astype(object)
    age[rng.rand(n) < 0.16] = np.nan
    sibsp = rng.choice([0, 1, 2, 3], size=n, p=[0.68, 0.22, 0.07, 0.03])
    parch = rng.choice([0, 1, 2], size=n, p=[0.76, 0.15, 0.09])
    fare_base = np.where(pclass == 1, 72.0, np.where(pclass == 2, 22.0, 11.0))
    fare = np.round(np.abs(fare_base + rng.exponential(15.0, size=n)), 2)
    embarked = rng.choice(['S', 'C', 'Q'], size=n, p=[0.72, 0.19, 0.09]).astype(object)
    embarked[rng.rand(n) < 0.04] = np.nan
    logit = -1.2 + (sex == 'female') * 2.1 + (pclass == 1) * 1.1 - (pclass == 3) * 0.8 - 0.02 * pd.to_numeric(pd.Series(age), errors='coerce').fillna(29).values
    prob = 1.0 / (1.0 + np.exp(-logit))
    survived = (rng.rand(n) < prob).astype(int)
    df_out = pd.DataFrame({
        'PassengerId': np.arange(1, n + 1),
        'Pclass': pclass,
        'Sex': sex,
        'Age': age,
        'SibSp': sibsp,
        'Parch': parch,
        'Fare': fare,
        'Embarked': embarked,
        'Survived': survived,
    })
    return df_out
`,
  },

  housing: {
    id: 'housing',
    fileName: 'housing.csv',
    title: 'House Prices (Hồi quy & Xử lý Skew/Outliers)',
    description:
      'Dữ liệu 320 căn nhà gồm diện tích, số phòng, năm xây, khu vực, khoảng cách trung tâm và giá nhà mục tiêu SalePrice.',
    rows: 320,
    cols: 9,
    targetColumn: 'SalePrice',
    columnsSummary: ['HouseId', 'LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'Neighborhood', 'DistCenterKm', 'HasGarage', 'SalePrice'],
    generatorPython: `
def _gen_housing():
    rng = np.random.RandomState(101)
    n = 320
    living = np.round(rng.lognormal(mean=7.25, sigma=0.35, size=n)).astype(float)
    lot = np.round(living * rng.uniform(2.5, 6.0, size=n))
    bedrooms = rng.choice([1, 2, 3, 4, 5], size=n, p=[0.06, 0.24, 0.42, 0.22, 0.06])
    year_built = rng.randint(1955, 2024, size=n)
    neigh = rng.choice(['Downtown', 'SuburbNorth', 'LakeSide', 'GreenPark', 'Industrial'], size=n, p=[0.22, 0.28, 0.16, 0.20, 0.14])
    dist = np.round(rng.uniform(0.8, 22.0, size=n), 2)
    garage = rng.choice([0, 1], size=n, p=[0.25, 0.75])
    neigh_bonus = np.select(
        [neigh == 'Downtown', neigh == 'LakeSide', neigh == 'GreenPark', neigh == 'SuburbNorth'],
        [68000, 82000, 45000, 26000],
        default=0
    )
    price = (
        65000 + living * 145 + lot * 3.2 + bedrooms * 9500
        + (year_built - 1950) * 900 + garage * 18000 - dist * 2400
        + neigh_bonus + rng.normal(0, 16000, size=n)
    )
    living[rng.rand(n) < 0.05] = np.nan
    df_out = pd.DataFrame({
        'HouseId': np.arange(1001, 1001 + n),
        'LotArea': lot,
        'LivingArea': living,
        'Bedrooms': bedrooms,
        'YearBuilt': year_built,
        'Neighborhood': neigh,
        'DistCenterKm': dist,
        'HasGarage': garage,
        'SalePrice': np.round(np.maximum(price, 45000), -2),
    })
    return df_out
`,
  },

  housing_test: {
    id: 'housing_test',
    fileName: 'housing_test.csv',
    title: 'House Prices Test Set (Không có SalePrice)',
    description: 'Tập test 80 căn nhà không có cột SalePrice dùng thực hành dự đoán và xuất submission.csv.',
    rows: 80,
    cols: 8,
    columnsSummary: ['HouseId', 'LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'Neighborhood', 'DistCenterKm', 'HasGarage'],
    generatorPython: `
def _gen_housing_test():
    rng = np.random.RandomState(202)
    n = 80
    living = np.round(rng.lognormal(mean=7.25, sigma=0.35, size=n)).astype(float)
    lot = np.round(living * rng.uniform(2.5, 6.0, size=n))
    bedrooms = rng.choice([1, 2, 3, 4, 5], size=n, p=[0.06, 0.24, 0.42, 0.22, 0.06])
    year_built = rng.randint(1955, 2024, size=n)
    neigh = rng.choice(['Downtown', 'SuburbNorth', 'LakeSide', 'GreenPark', 'Industrial'], size=n)
    dist = np.round(rng.uniform(0.8, 22.0, size=n), 2)
    garage = rng.choice([0, 1], size=n, p=[0.25, 0.75])
    return pd.DataFrame({
        'HouseId': np.arange(2001, 2001 + n),
        'LotArea': lot,
        'LivingArea': living,
        'Bedrooms': bedrooms,
        'YearBuilt': year_built,
        'Neighborhood': neigh,
        'DistCenterKm': dist,
        'HasGarage': garage,
    })
`,
  },

  orders: {
    id: 'orders',
    fileName: 'orders.csv',
    title: 'E-Commerce Orders (Bảng giao dịch)',
    description: '400 đơn hàng thương mại điện tử có OrderDate, CustomerId (để Join/GroupKFold), danh mục, số lượng và doanh thu.',
    rows: 400,
    cols: 7,
    targetColumn: 'Returned',
    columnsSummary: ['OrderId', 'CustomerId', 'OrderDate', 'Category', 'Quantity', 'UnitPrice', 'Returned'],
    generatorPython: `
def _gen_orders():
    rng = np.random.RandomState(77)
    n = 400
    cust_ids = rng.randint(1, 61, size=n)
    dates = pd.date_range('2025-01-01', periods=120, freq='D')
    order_dates = rng.choice(dates.strftime('%Y-%m-%d'), size=n)
    cats = rng.choice(['Electronics', 'Fashion', 'Home', 'Beauty', 'Books'], size=n, p=[0.25, 0.30, 0.20, 0.15, 0.10])
    qty = rng.choice([1, 2, 3, 4, 5], size=n, p=[0.50, 0.25, 0.15, 0.06, 0.04])
    unit_price = np.round(np.where(cats == 'Electronics', rng.uniform(60, 450, n), rng.uniform(8, 95, n)), 2)
    ret_prob = 0.08 + (cats == 'Fashion') * 0.18 + (qty >= 4) * 0.12
    returned = (rng.rand(n) < ret_prob).astype(int)
    return pd.DataFrame({
        'OrderId': [f'ORD-{1000+i}' for i in range(n)],
        'CustomerId': cust_ids,
        'OrderDate': order_dates,
        'Category': cats,
        'Quantity': qty,
        'UnitPrice': unit_price,
        'Returned': returned,
    })
`,
  },

  customers: {
    id: 'customers',
    fileName: 'customers.csv',
    title: 'Customers Master (Bảng khách hàng)',
    description: 'Hồ sơ 60 khách hàng duy nhất dùng để Merge/Join với orders.csv theo khóa CustomerId.',
    rows: 60,
    cols: 5,
    columnsSummary: ['CustomerId', 'Tier', 'City', 'SignupYear', 'AccountAgeMonths'],
    generatorPython: `
def _gen_customers():
    rng = np.random.RandomState(88)
    n = 60
    return pd.DataFrame({
        'CustomerId': np.arange(1, n + 1),
        'Tier': rng.choice(['Bronze', 'Silver', 'Gold', 'Platinum'], size=n, p=[0.4, 0.3, 0.2, 0.1]),
        'City': rng.choice(['HaNoi', 'HCM', 'DaNang', 'CanTho'], size=n, p=[0.35, 0.40, 0.15, 0.10]),
        'SignupYear': rng.randint(2019, 2025, size=n),
        'AccountAgeMonths': rng.randint(2, 72, size=n),
    })
`,
  },

  churn: {
    id: 'churn',
    fileName: 'bank_churn.csv',
    title: 'Bank Customer Churn (Mất cân bằng nhẹ)',
    description: '350 khách hàng ngân hàng (tỷ lệ rời bỏ ~22%) với điểm tín dụng, số dư, số sản phẩm và nhãn Churn.',
    rows: 350,
    cols: 9,
    targetColumn: 'Churn',
    columnsSummary: ['CustomerId', 'CreditScore', 'Country', 'Gender', 'Age', 'Balance', 'NumProducts', 'IsActiveMember', 'Churn'],
    generatorPython: `
def _gen_churn():
    rng = np.random.RandomState(303)
    n = 350
    score = rng.randint(420, 850, size=n)
    country = rng.choice(['Vietnam', 'Singapore', 'Thailand'], size=n, p=[0.5, 0.25, 0.25])
    gender = rng.choice(['Male', 'Female'], size=n)
    age = rng.randint(20, 68, size=n)
    bal = np.round(np.where(rng.rand(n) < 0.28, 0.0, rng.uniform(5000, 180000, n)), 2)
    nprod = rng.choice([1, 2, 3, 4], size=n, p=[0.5, 0.38, 0.09, 0.03])
    active = rng.choice([0, 1], size=n, p=[0.42, 0.58])
    logit = -2.0 + (age > 45) * 1.1 - active * 1.2 + (nprod >= 3) * 1.6 - (score - 600) * 0.003 + (bal > 100000) * 0.4
    churn = (rng.rand(n) < 1.0 / (1.0 + np.exp(-logit))).astype(int)
    return pd.DataFrame({
        'CustomerId': np.arange(5001, 5001 + n),
        'CreditScore': score,
        'Country': country,
        'Gender': gender,
        'Age': age,
        'Balance': bal,
        'NumProducts': nprod,
        'IsActiveMember': active,
        'Churn': churn,
    })
`,
  },

  fraud: {
    id: 'fraud',
    fileName: 'credit_fraud.csv',
    title: 'Credit Fraud (Mất cân bằng nặng ~4% Positive)',
    description: '500 giao dịch thẻ với chỉ ~4% gian lận để thực hành PR-AUC, F1, class_weight và Threshold Tuning.',
    rows: 500,
    cols: 7,
    targetColumn: 'IsFraud',
    columnsSummary: ['TxId', 'Amount', 'HourOfDay', 'DistanceKm', 'IsForeign', 'V1', 'IsFraud'],
    generatorPython: `
def _gen_fraud():
    rng = np.random.RandomState(505)
    n = 500
    is_fraud = (rng.rand(n) < 0.045).astype(int)
    amount = np.round(np.where(is_fraud == 1, rng.exponential(450, n) + 120, rng.exponential(65, n) + 5), 2)
    hour = np.where(is_fraud == 1, rng.choice([0, 1, 2, 3, 4, 23], n), rng.randint(7, 23, n))
    dist = np.round(np.where(is_fraud == 1, rng.uniform(50, 900, n), rng.exponential(12, n)), 2)
    foreign = np.where(is_fraud == 1, rng.choice([0, 1], n, p=[0.25, 0.75]), rng.choice([0, 1], n, p=[0.92, 0.08]))
    v1 = np.round(np.where(is_fraud == 1, rng.normal(-2.2, 1.0, n), rng.normal(0.2, 1.0, n)), 4)
    return pd.DataFrame({
        'TxId': np.arange(1, n + 1),
        'Amount': amount,
        'HourOfDay': hour,
        'DistanceKm': dist,
        'IsForeign': foreign,
        'V1': v1,
        'IsFraud': is_fraud,
    })
`,
  },

  daily_sales: {
    id: 'daily_sales',
    fileName: 'daily_sales.csv',
    title: 'Daily Retail Sales (Chuỗi thời gian 365 ngày × 3 cửa hàng)',
    description: '1.095 dòng doanh số bán lẻ hàng ngày của 3 cửa hàng (S1, S2, S3) trong 365 ngày có xu hướng, mùa vụ cuối tuần, khuyến mãi và nhiệt độ.',
    rows: 1095,
    cols: 5,
    targetColumn: 'Sales',
    columnsSummary: ['Date', 'StoreId', 'Promo', 'TempC', 'Sales'],
    generatorPython: `
def _gen_daily_sales():
    rng = np.random.RandomState(99)
    n_days = 365
    dates = pd.date_range('2025-01-01', periods=n_days, freq='D')
    dow = dates.dayofweek
    frames = []
    for store_id, base_level, slope in [('S1', 180.0, 0.18), ('S2', 215.0, 0.22), ('S3', 155.0, 0.14)]:
        promo = rng.choice([0, 1], size=n_days, p=[0.75, 0.25])
        temp = np.round(24 + 6 * np.sin(2 * np.pi * np.arange(n_days) / 365.0) + rng.normal(0, 1.5, n_days), 1)
        weekend_boost = np.where(dow >= 5, 45.0, 0.0)
        trend = np.arange(n_days) * slope
        sales = np.round(base_level + trend + weekend_boost + promo * 60 + rng.normal(0, 10, n_days), 2)
        frames.append(pd.DataFrame({
            'Date': dates.strftime('%Y-%m-%d'),
            'StoreId': store_id,
            'Promo': promo,
            'TempC': temp,
            'Sales': sales,
        }))
    return pd.concat(frames, ignore_index=True)
`,
  },

  iris_ext: {
    id: 'iris_ext',
    fileName: 'iris_extended.csv',
    title: 'Iris Multi-Class (Phân loại 3 lớp & Clustering)',
    description: '180 mẫu hoa gồm 4 đặc trưng hình thái (Sepal/Petal Length & Width) và 3 loài setosa, versicolor, virginica.',
    rows: 180,
    cols: 5,
    targetColumn: 'Species',
    columnsSummary: ['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth', 'Species'],
    generatorPython: `
def _gen_iris_ext():
    from sklearn.datasets import load_iris
    data = load_iris(as_frame=True)
    df_base = data.frame.copy()
    df_base.columns = ['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth', 'target']
    names = {0: 'setosa', 1: 'versicolor', 2: 'virginica'}
    df_base['Species'] = df_base['target'].map(names)
    df_base = df_base.drop(columns=['target'])
    rng = np.random.RandomState(12)
    extra = df_base.sample(30, random_state=12).copy()
    for col in ['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']:
        extra[col] = np.round(extra[col] + rng.normal(0, 0.08, len(extra)), 2)
    return pd.concat([df_base, extra], ignore_index=True)
`,
  },

  sensor_iot: {
    id: 'sensor_iot',
    fileName: 'sensor_iot.csv',
    title: 'IoT Machine Telemetry (Anomaly Detection & Outlier)',
    description: '300 bản ghi cảm biến nhiệt độ, độ rung, áp suất, công suất trong đó ~5% thiết bị có dấu hiệu hỏng hóc bất thường.',
    rows: 300,
    cols: 6,
    targetColumn: 'IsAnomaly',
    columnsSummary: ['DeviceId', 'TempC', 'VibrationMm', 'PressureBar', 'PowerKw', 'IsAnomaly'],
    generatorPython: `
def _gen_sensor_iot():
    rng = np.random.RandomState(404)
    n = 300
    anom = np.zeros(n, dtype=int)
    anom[rng.choice(n, size=15, replace=False)] = 1
    temp = np.round(np.where(anom == 1, rng.normal(92, 6, n), rng.normal(62, 4, n)), 2)
    vib = np.round(np.where(anom == 1, rng.normal(7.5, 1.5, n), rng.normal(2.1, 0.4, n)), 3)
    pres = np.round(np.where(anom == 1, rng.normal(14.5, 2.0, n), rng.normal(9.8, 0.7, n)), 2)
    power = np.round(temp * 0.4 + vib * 3.1 + rng.normal(10, 1.5, n), 2)
    return pd.DataFrame({
        'DeviceId': [f'DEV-{(i % 20) + 1:02d}' for i in range(n)],
        'TempC': temp,
        'VibrationMm': vib,
        'PressureBar': pres,
        'PowerKw': power,
        'IsAnomaly': anom,
    })
`,
  },

  medical_vitals: {
    id: 'medical_vitals',
    fileName: 'medical_vitals.csv',
    title: 'Patient Vitals (GroupKFold theo PatientId)',
    description: '280 lần đo sức khỏe từ 70 bệnh nhân (mỗi bệnh nhân có nhiều lần đo) — bài chuẩn thực hành GroupKFold chống Leakage.',
    rows: 280,
    cols: 7,
    targetColumn: 'RiskHigh',
    columnsSummary: ['PatientId', 'VisitNo', 'SystolicBP', 'Glucose', 'BMI', 'Age', 'RiskHigh'],
    generatorPython: `
def _gen_medical_vitals():
    rng = np.random.RandomState(606)
    rows = []
    for pid in range(1, 71):
        age = rng.randint(25, 78)
        base_bp = 110 + age * 0.4 + rng.normal(0, 8)
        base_glu = 88 + rng.normal(0, 14)
        bmi = round(float(rng.normal(25, 4)), 1)
        p_risk = 1 if (base_bp > 138 or base_glu > 118 or age > 62) and rng.rand() < 0.82 else 0
        for v in range(1, 5):
            rows.append({
                'PatientId': f'P-{pid:03d}',
                'VisitNo': v,
                'SystolicBP': round(float(base_bp + rng.normal(0, 4)), 1),
                'Glucose': round(float(max(60, base_glu + rng.normal(0, 6))), 1),
                'BMI': bmi,
                'Age': age,
                'RiskHigh': p_risk,
            })
    return pd.DataFrame(rows)
`,
  },

  text_reviews: {
    id: 'text_reviews',
    fileName: 'text_reviews.csv',
    title: 'Product Reviews (NLP / TF-IDF Text Features)',
    description: '200 đánh giá sản phẩm tiếng Anh/Việt ngắn kèm số sao và nhãn Sentiment (0/1) thực hành TF-IDF & Pipeline kết hợp.',
    rows: 200,
    cols: 4,
    targetColumn: 'Sentiment',
    columnsSummary: ['ReviewId', 'ReviewText', 'Rating', 'Sentiment'],
    generatorPython: `
def _gen_text_reviews():
    rng = np.random.RandomState(808)
    pos_phrases = [
        'great product fast delivery very satisfied',
        'excellent quality works smoothly worth price',
        'amazing design love it recommend everyone',
        'san pham tot giao hang nhanh hai long',
        'chat luong tuyet voi dung rat muot',
    ]
    neg_phrases = [
        'terrible quality broke quickly waste money',
        'very disappointed slow shipping damaged box',
        'bad battery life poor support avoid buying',
        'hang kem chat luong giao cham rat that vong',
        'khong giong mo ta bi loi sau mot ngay',
    ]
    texts, ratings, labels = [], [], []
    for i in range(200):
        is_pos = 1 if i % 2 == 0 else 0
        txt = pos_phrases[i % len(pos_phrases)] if is_pos else neg_phrases[i % len(neg_phrases)]
        texts.append(txt + f' batch_{i % 7}')
        ratings.append(int(rng.choice([4, 5]) if is_pos else rng.choice([1, 2])))
        labels.append(is_pos)
    return pd.DataFrame({
        'ReviewId': np.arange(1, 201),
        'ReviewText': texts,
        'Rating': ratings,
        'Sentiment': labels,
    })
`,
  },

  kaggle_loan_train: {
    id: 'kaggle_loan_train',
    fileName: 'loan_train.csv',
    title: 'Kaggle Competition: Loan Approval Train',
    description: '400 hồ sơ vay vốn (dữ liệu tổng hợp chuẩn thi đấu Kaggle) có đầy đủ nhiễu, thiếu giá trị, cột nhóm và nhãn LoanStatus.',
    rows: 400,
    cols: 10,
    targetColumn: 'LoanStatus',
    columnsSummary: ['id', 'ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears', 'Grade', 'Purpose', 'Region', 'LoanStatus'],
    generatorPython: `
def _gen_kaggle_loan_train():
    rng = np.random.RandomState(2026)
    n = 400
    inc = np.round(rng.lognormal(8.5, 0.55, n)).astype(float)
    co_inc = np.round(np.where(rng.rand(n) < 0.4, 0.0, rng.lognormal(7.6, 0.5, n)))
    loan_amt = np.round(rng.uniform(45, 520, n), 1)
    cred_hist = rng.choice([0.0, 1.0], n, p=[0.18, 0.82]).astype(object)
    cred_hist[rng.rand(n) < 0.05] = np.nan
    emp_yrs = rng.randint(0, 25, n)
    grade = rng.choice(['A', 'B', 'C', 'D', 'E'], n, p=[0.22, 0.30, 0.25, 0.15, 0.08])
    purpose = rng.choice(['home', 'business', 'education', 'auto', 'medical'], n)
    region = rng.choice(['North', 'Central', 'South'], n, p=[0.35, 0.25, 0.40])
    dti = loan_amt / np.maximum(inc + co_inc, 1) * 100.0
    grade_pen = np.select([grade == 'A', grade == 'B', grade == 'C', grade == 'D'], [-0.6, -0.2, 0.3, 0.8], default=1.4)
    logit = -1.6 + (pd.Series(cred_hist).fillna(1.0).values == 0.0) * 2.4 + dti * 0.18 + grade_pen - emp_yrs * 0.04
    status = (rng.rand(n) < 1.0 / (1.0 + np.exp(-logit))).astype(int)
    return pd.DataFrame({
        'id': np.arange(1, n + 1),
        'ApplicantIncome': inc,
        'CoapplicantIncome': co_inc,
        'LoanAmount': loan_amt,
        'CreditHistory': cred_hist,
        'EmploymentYears': emp_yrs,
        'Grade': grade,
        'Purpose': purpose,
        'Region': region,
        'LoanStatus': status,
    })
`,
  },

  kaggle_loan_test: {
    id: 'kaggle_loan_test',
    fileName: 'loan_test.csv',
    title: 'Kaggle Competition: Loan Approval Test',
    description: '120 hồ sơ test dùng dự đoán xác suất LoanStatus và xuất file submission.csv chuẩn cuộc thi.',
    rows: 120,
    cols: 9,
    columnsSummary: ['id', 'ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears', 'Grade', 'Purpose', 'Region'],
    generatorPython: `
def _gen_kaggle_loan_test():
    rng = np.random.RandomState(2027)
    n = 120
    inc = np.round(rng.lognormal(8.5, 0.55, n)).astype(float)
    co_inc = np.round(np.where(rng.rand(n) < 0.4, 0.0, rng.lognormal(7.6, 0.5, n)))
    loan_amt = np.round(rng.uniform(45, 520, n), 1)
    cred_hist = rng.choice([0.0, 1.0], n, p=[0.18, 0.82]).astype(object)
    cred_hist[rng.rand(n) < 0.05] = np.nan
    emp_yrs = rng.randint(0, 25, n)
    grade = rng.choice(['A', 'B', 'C', 'D', 'E'], n, p=[0.22, 0.30, 0.25, 0.15, 0.08])
    purpose = rng.choice(['home', 'business', 'education', 'auto', 'medical'], n)
    region = rng.choice(['North', 'Central', 'South'], n, p=[0.35, 0.25, 0.40])
    return pd.DataFrame({
        'id': np.arange(1001, 1001 + n),
        'ApplicantIncome': inc,
        'CoapplicantIncome': co_inc,
        'LoanAmount': loan_amt,
        'CreditHistory': cred_hist,
        'EmploymentYears': emp_yrs,
        'Grade': grade,
        'Purpose': purpose,
        'Region': region,
    })
`,
  },
};

export function buildDatasetMaterializerPython(datasetIds: string[]): string {
  const uniqueIds = Array.from(new Set(datasetIds));
  const generators = uniqueIds
    .map((id) => CURRICULUM_DATASETS[id])
    .filter(Boolean)
    .map(
      (ds) => `${ds.generatorPython}
_df_tmp = _gen_${ds.id}()
_df_tmp.to_csv(${JSON.stringify(ds.fileName)}, index=False)
if os.path.exists('/tmp'):
    _df_tmp.to_csv('/tmp/' + ${JSON.stringify(ds.fileName)}, index=False)
`
    );

  return `import os
import numpy as np
import pandas as pd
${generators.join('\n')}`;
}
