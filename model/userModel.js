import mongoose from "mongoose";




// Mongoose Schema : 

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required!']
    },
    email: {
        type: String,
        required: [true, 'Email is required!']
    },
    password: {
        type: String,
        required: [true, 'Password is required!']
    },
    token: {
        type: String
    },
    resetPasswordToken: {
        type: String,
    },
    profilePicture: {
        type: String,
        default: 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3485.jpg'
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


const userModel = mongoose.model('User', userSchema);
export default userModel;