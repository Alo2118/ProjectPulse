import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email già registrata' });
    }

    // Create user with default role 'dipendente' and active=false (pending approval)
    const user = User.create({
      email,
      password,
      first_name,
      last_name,
      role: 'dipendente',
      active: false
    });

    // Don't auto-login, user must wait for admin approval
    res.status(201).json({
      message: 'Registrazione completata. Il tuo account è in attesa di approvazione da parte di un amministratore.',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const isValidPassword = User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Check if user is active (approved by admin)
    if (!user.active) {
      return res.status(403).json({
        error: 'Account in attesa di approvazione. Un amministratore deve approvare il tuo account prima che tu possa accedere.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = User.findById(req.user.id);

    // Check if user is still active
    if (!user.active) {
      return res.status(401).json({ error: 'Account disattivato' });
    }

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
