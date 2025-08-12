# src/model.py
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import os

def train_model(X, y, test_size=0.2, random_state=42):
    """
    Entrena un Random Forest para predecir inundaciones.
    Divide datos en train/test, entrena, evalúa y retorna el modelo.
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y)

    model = RandomForestClassifier(n_estimators=100, random_state=random_state)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("Reporte de clasificación:")
    print(classification_report(y_test, y_pred))
    print("Matriz de confusión:")
    print(confusion_matrix(y_test, y_pred))

    return model

def save_model(model, model_path='models/flood_rf_model.pkl'):
    """
    Guarda el modelo entrenado en disco.
    """
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    print(f"Modelo guardado en {model_path}")

def load_model(model_path='models/flood_rf_model.pkl'):
    """
    Carga modelo guardado desde disco.
    """
    model = joblib.load(model_path)
    return model

if __name__ == "__main__":
    from data_processing import load_data, create_lag_features, split_features_target

    df = load_data('../data/historical/flood_data.csv')
    df = create_lag_features(df)
    X, y = split_features_target(df)

    model = train_model(X, y)
    save_model(model)
