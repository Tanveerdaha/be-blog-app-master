import mongoose from "mongoose";




const blogSchema = new mongoose.Schema({

    userId: {
        type: String,
        required: true
    },
    blogTitle: {
        type: String,
        required: [true, 'Blog title is required!'],
        unique: true
    },
    blogCategory: {
        type: String,
        default: 'All'
    },
    blogImgFile: {
        type: String,
        default: 'https://img.freepik.com/free-vector/laptop-with-program-code-isometric-icon-software-development-programming-applications-dark-neon_39422-971.jpg',
    },
    blogBody: {
        type: String,
        required: [true, 'Blog body is required']
    },
    slug: {
        type: String,
        required: true
    }
}, { timestamps: true });

const blogModel = mongoose.model('blog', blogSchema);
export default blogModel;

