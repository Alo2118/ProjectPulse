import User from '../models/User.js';

export const getAllUsers = async (req, res) => {
  try {
    // Query parameter to get only active users
    const activeOnly = req.query.active === 'true';
    const users = activeOnly ? User.getActive() : User.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
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
    const { email, password, first_name, last_name, role, active } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    if (!['dipendente', 'direzione', 'amministratore'].includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    // Check if email already exists
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email già registrata' });
    }

    const user = User.create({ email, password, first_name, last_name, role, active });

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
    const { email, first_name, last_name, role, password, active } = req.body;

    // Check if user exists
    const existingUser = User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Validate role if provided
    if (role && !['dipendente', 'direzione', 'amministratore'].includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = User.findByEmail(email);
      if (emailTaken) {
        return res.status(400).json({ error: 'Email già registrata' });
      }
    }

    // Prevent user from removing their own amministratore role
    if (req.user.id === parseInt(id) && role && role !== 'amministratore') {
      return res.status(403).json({ error: 'Non puoi modificare il tuo ruolo' });
    }

    // Prevent user from deactivating themselves
    if (req.user.id === parseInt(id) && active === false) {
      return res.status(403).json({ error: 'Non puoi disattivare il tuo account' });
    }

    const updatedUser = User.update(id, { email, first_name, last_name, role, password, active });

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
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Prevent user from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ error: 'Non puoi eliminare il tuo account' });
    }

    // Soft delete (deactivate)
    const deactivatedUser = User.delete(id);
    const { password, ...userWithoutPassword } = deactivatedUser;
    res.json({
      message: 'Utente disattivato con successo',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    if (existingUser.active) {
      return res.status(400).json({ error: 'L\'utente è già attivo' });
    }

    const reactivatedUser = User.reactivate(id);
    const { password, ...userWithoutPassword } = reactivatedUser;
    res.json({
      message: 'Utente riattivato con successo',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
