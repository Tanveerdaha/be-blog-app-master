import express from 'express';
const blogRouter = express.Router();
import { postBlog, getAllBlogs, deleteBlog, updateBlog } from '../controller/blogController.js';
import verifyUserMiddleware from '../middleware/verifyUserMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

blogRouter.post('/post-blog', upload.single("blogImgFile"), verifyUserMiddleware, postBlog)
    .get('/get-all-blogs', getAllBlogs)
    .delete('/delete-blog/:blogid/:userid', verifyUserMiddleware, deleteBlog)
    .put('/update-blog/:blogid/:userid', verifyUserMiddleware, updateBlog)






export default blogRouter;