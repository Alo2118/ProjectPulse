import User from '../models/User.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = User.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't send password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['dipendente', 'direzione', 'amministratore'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = User.create({ email, password, name, role });

    // Don't send password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;

    // Check if user exists
    const existingUser = User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate role if provided
    if (role && !['dipendente', 'direzione', 'amministratore'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = User.findByEmail(email);
      if (emailTaken) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Prevent user from removing their own amministratore role
    if (req.user.id === parseInt(id) && role && role !== 'amministratore') {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    const updatedUser = User.update(id, { email, name, role, password });

    // Don't send password
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent user from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    User.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
