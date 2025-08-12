# src/data_processing.py
import pandas as pd
import numpy as np

def load_data(filepath):
    """
    Carga archivo CSV con datos meteorológicos históricos y labels.
    """
    df = pd.read_csv(filepath, parse_dates=['date'])
    return df

def create_lag_features(df, lag_days=3, target_col='flood'):
    """
    Crea variables con valores rezagados (lags) para capturar historial reciente.
    lag_days: número de días atrás para crear features.
    """
    for lag in range(1, lag_days + 1):
        for col in df.columns:
            if col not in ['date', target_col]:
                df[f'{col}_lag{lag}'] = df[col].shift(lag)
    df.dropna(inplace=True)
    return df

def split_features_target(df, target_col='flood'):
    """
    Separa variables predictoras X y variable objetivo y.
    """
    X = df.drop(columns=['date', target_col])
    y = df[target_col]
    return X, y

if __name__ == "__main__":
    # Prueba rápida
    df = load_data('../data/historical/flood_data.csv')
    df_lags = create_lag_features(df)
    X, y = split_features_target(df_lags)
    print(X.head())
    print(y.head())
