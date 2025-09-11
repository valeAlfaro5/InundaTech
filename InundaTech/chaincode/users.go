package main

import (
	"encoding/json"
	"fmt"
	"time"
	"strings"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

// User estructura para usuarios
type User struct {
	DocType     string `json:"docType"`
	ID          string `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	LastLogin   string `json:"lastLogin"`
}

// Alert estructura para alertas
type Alert struct {
	DocType     string `json:"docType"`
	ID          string `json:"id"`
	Title       string `json:"title"`
	Message     string `json:"message"`
	Severity    string `json:"severity"`
	Method      string `json:"method"`
	CreatedBy   string `json:"createdBy"`
	Recipients  int    `json:"recipients"`
	Timestamp   string `json:"timestamp"`
	Status      string `json:"status"`
}

// ================== FUNCIONES DE USUARIOS ================== //

func (s *SmartContract) CreateUser(ctx contractapi.TransactionContextInterface, 
	userId, name, email, phone, password, role, status string) error {
	
	userJSON, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON != nil {
		return fmt.Errorf("el usuario %s ya existe", userId)
	}

	user := User{
		DocType:   "user",
		ID:        userId,
		Name:      name,
		Email:     strings.ToLower(email),
		Phone:     phone,
		Password:  password,
		Role:      role,
		Status:    status,
		CreatedAt: time.Now().Format(time.RFC3339),
		UpdatedAt: time.Now().Format(time.RFC3339),
		LastLogin: "",
	}

	userJSON, err = json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %v", err)
	}

	return ctx.GetStub().PutState(userId, userJSON)
}

func (s *SmartContract) ReadUser(ctx contractapi.TransactionContextInterface, userId string) (string, error) {
	userJSON, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return "", fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON == nil {
		return "", fmt.Errorf("el usuario %s no existe", userId)
	}
	return string(userJSON), nil
}

func (s *SmartContract) GetUserByEmail(ctx contractapi.TransactionContextInterface, email string) (string, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"user","email":"%s"}}`, strings.ToLower(email))
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to get next result: %v", err)
		}
		return string(queryResponse.Value), nil
	}

	return "", fmt.Errorf("usuario con email %s no encontrado", email)
}

func (s *SmartContract) GetAllUsers(ctx contractapi.TransactionContextInterface) (string, error) {
	queryString := `{"selector":{"docType":"user"}}`
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	var users []User
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to get next result: %v", err)
		}

		var user User
		err = json.Unmarshal(queryResponse.Value, &user)
		if err != nil {
			return "", fmt.Errorf("failed to unmarshal user: %v", err)
		}
		users = append(users, user)
	}

	usersJSON, err := json.Marshal(users)
	if err != nil {
		return "", fmt.Errorf("failed to marshal users: %v", err)
	}

	return string(usersJSON), nil
}

func (s *SmartContract) UpdateUserLastLogin(ctx contractapi.TransactionContextInterface, userId string) error {
	userJSON, err := ctx.GetStub().GetState(userId)
	if err != nil {
		return fmt.Errorf("failed to read user: %v", err)
	}
	if userJSON == nil {
		return fmt.Errorf("user %s does not exist", userId)
	}

	var user User
	err = json.Unmarshal(userJSON, &user)
	if err != nil {
		return fmt.Errorf("failed to unmarshal user: %v", err)
	}

	user.LastLogin = time.Now().Format(time.RFC3339)
	user.UpdatedAt = user.LastLogin

	updatedUserJSON, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %v", err)
	}

	return ctx.GetStub().PutState(userId, updatedUserJSON)
}

// ================== FUNCIONES DE ALERTAS ================== //

func (s *SmartContract) CreateAlert(ctx contractapi.TransactionContextInterface, 
	alertId, title, message, severity, method, createdBy string, recipients int) error {
	
	alert := Alert{
		DocType:    "alert",
		ID:         alertId,
		Title:      title,
		Message:    message,
		Severity:   severity,
		Method:     method,
		CreatedBy:  createdBy,
		Recipients: recipients,
		Timestamp:  time.Now().Format(time.RFC3339),
		Status:     "active",
	}

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("failed to marshal alert: %v", err)
	}

	return ctx.GetStub().PutState(alertId, alertJSON)
}

func (s *SmartContract) GetAllAlerts(ctx contractapi.TransactionContextInterface) (string, error) {
	queryString := `{"selector":{"docType":"alert"}}`
	
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return "", fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []Alert
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return "", fmt.Errorf("failed to get next result: %v", err)
		}

		var alert Alert
		err = json.Unmarshal(queryResponse.Value, &alert)
		if err != nil {
			return "", fmt.Errorf("failed to unmarshal alert: %v", err)
		}
		alerts = append(alerts, alert)
	}

	alertsJSON, err := json.Marshal(alerts)
	if err != nil {
		return "", fmt.Errorf("failed to marshal alerts: %v", err)
	}

	return string(alertsJSON), nil
}

// ================== FUNCIONES DE COMPATIBILIDAD ================== //

func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, color string, size int, owner string, appraisedValue int) error {
	return nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %s", err.Error())
	}
}