# src/train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def load_data(filepath):
    df = pd.read_csv(filepath)
    return df

def prepare_data(df):
    X = df.drop(columns=['inundacion', 'fecha'])
    y = df['inundacion']
    return X, y

def train_and_save_model(data_path, model_path='models/flood_rf_model.pkl'):
    df = load_data(data_path)
    X, y = prepare_data(df)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    print(f"Modelo entrenado y guardado en {model_path}")

if __name__ == '__main__':
    data_csv = '../data/historical/inundaciones.csv'  # Ajusta esta ruta según donde tengas tus datos
    train_and_save_model(data_csv)