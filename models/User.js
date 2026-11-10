const mongoose = require('mongoose');
const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });

userSchema.statics.hashPassword = async function (password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt, 64)).toString('hex')}`;
};
userSchema.methods.checkPassword = async function (password) {
  const [salt, hash] = this.passwordHash.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), await derive(password, salt, 64));
};

module.exports = mongoose.model('User', userSchema);
