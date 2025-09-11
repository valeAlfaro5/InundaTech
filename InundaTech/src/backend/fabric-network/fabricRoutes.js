import express from "express";
import { invokeTransaction } from "./invoke.js";
import { queryTransaction } from "./query.js";
import bcrypt from 'bcrypt';

const router = express.Router();

// Ruta para registro de usuarios
router.post("/register-user", async (req, res) => {
  console.log("📨 Recibida petición de registro:", req.body);
  
  const { name, email, phone, password } = req.body;
  
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Faltan datos requeridos (name, email, phone, password)" 
    });
  }

  try {
    // Generar ID único para el usuario
    const userId = `USER_${Date.now()}`;
    
    const hashedPassword = await bcrypt.hash(password, 12);

    // Invocar la transacción en el chaincode
    const tx = await invokeTransaction("CreateUser", [
      userId,
      name,
      email,
      phone,
      hashedPassword,
      "user",   
      "active"   
    ]);

    console.log("✅ Usuario registrado en blockchain:", { userId, name, email });
    
    res.json({ 
      success: true, 
      message: "Usuario registrado en blockchain", 
      userId,
      txId: tx,
      user: { name, email, phone }
    });
  } catch (err) {
    console.error("Error creando usuario:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Ruta para login de usuarios
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Faltan email o password" 
    });
  }

  try {
    // Buscar usuario por email
    const result = await queryTransaction("GetUserByEmail", [email.toLowerCase()]);
    const user = JSON.parse(result);
    
    // Verificar password
    const passwordMatch = await bcrypt.compare(password, user.Password);
    
    if (passwordMatch) {
      res.json({ 
        success: true, 
        message: "Login exitoso",
        user: {
          id: user.ID,
          name: user.Name,
          email: user.Email,
          phone: user.Phone,
          role: user.Role
        }
      });
    } else {
      res.status(401).json({ 
        success: false,
        
        message: "Contraseña incorrecta" 
      });
    }
  } catch (err) {
    console.error("Error en login:", err);
    res.status(404).json({ 
      success: false, 
      message: "Usuario no encontrado" 
    });
  }
});

// Ruta para obtener todos los usuarios
router.get("/users", async (req, res) => {
  try {
    const result = await queryTransaction("GetAllUsers", []);
    const users = JSON.parse(result);
    
    // No retornar passwords
    const usersWithoutPassword = users.map(user => ({
      id: user.ID,
      name: user.Name,
      email: user.Email,
      phone: user.Phone,
      role: user.Role,
      status: user.Status,
      createdAt: user.CreatedAt
    }));
    
    res.json({ 
      success: true, 
      users: usersWithoutPassword,
      count: users.length
    });
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    const result = await queryTransaction("GetAllUsers", []);
    const users = JSON.parse(result);
    
    res.json({ 
      success: true, 
      message: "✅ Servidor Fabric funcionando correctamente",
      timestamp: new Date().toISOString(),
      usersCount: users.length,
      status: "healthy"
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Error conectando con blockchain",
      error: err.message 
    });
  }
});

export default router;