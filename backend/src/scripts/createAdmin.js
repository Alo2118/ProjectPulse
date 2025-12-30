import User from '../models/User.js';

console.log('🔐 Creating administrator user...');

try {
  // Check if user already exists
  const existing = User.findByEmail('nicola.mussolin@mikai.it');

  if (existing) {
    console.log('ℹ️  User already exists');
    console.log('   Email:', existing.email);
    console.log('   Role:', existing.role);

    if (existing.role !== 'amministratore') {
      console.log('🔄 Updating role to amministratore...');
      User.update(existing.id, { role: 'amministratore' });
      console.log('✅ Role updated successfully');
    }
  } else {
    const user = User.create({
      email: 'nicola.mussolin@mikai.it',
      password: 'password123',
      name: 'Nicola Mussolin',
      role: 'amministratore'
    });

    console.log('✅ Administrator user created successfully');
    console.log('   Email: nicola.mussolin@mikai.it');
    console.log('   Password: password123');
    console.log('   Name: Nicola Mussolin');
    console.log('   Role: amministratore');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
