import User from '../models/User.js';

console.log('🔐 Creating administrator user...');

try {
  // Check if user already exists
  const existing = User.findByEmail('nicola@admin.it');

  if (existing) {
    console.log('ℹ️  User already exists');
    console.log('   Email:', existing.email);
    console.log('   Role:', existing.role);

    if (existing.role !== 'amministratore' || !existing.active) {
      console.log('🔄 Updating role to amministratore and activating...');
      User.update(existing.id, { role: 'amministratore', active: true });
      console.log('✅ Role updated and user activated successfully');
    }
  } else {
    const user = User.create({
      email: 'nicola@admin.it',
      password: 'password123',
      first_name: 'Nicola',
      last_name: 'Admin',
      role: 'amministratore',
      active: true
    });

    console.log('✅ Administrator user created successfully');
    console.log('   Email: nicola@admin.it');
    console.log('   Password: password123');
    console.log('   Name: Nicola Admin');
    console.log('   Role: amministratore');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
