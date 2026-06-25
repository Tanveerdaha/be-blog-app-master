import mongoose from 'mongoose';



const commentSchema = new mongoose.Schema({

    comment: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true

    },
    blogId: {
        type: String,
        required: true

    },
    likes: {
        type: Array,
        default: []
    },
    numberOfLikes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });


const commentModel = mongoose.model('comment', commentSchema);

export default commentModel;