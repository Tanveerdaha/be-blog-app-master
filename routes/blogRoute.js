import express from 'express';
const blogRouter = express.Router();
import { postBlog, getAllBlogs, deleteBlog, updateBlog } from '../controller/blogController.js';
import verifyUserMiddleware from '../middleware/verifyUserMiddleware.js';
import loadUserMiddleware from '../middleware/loadUserMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

blogRouter.post('/post-blog', upload.single("blogImgFile"), verifyUserMiddleware, loadUserMiddleware, postBlog)
    .get('/get-all-blogs', getAllBlogs)
    .delete('/delete-blog/:blogid/:userid', verifyUserMiddleware, loadUserMiddleware, deleteBlog)
    .put('/update-blog/:blogid/:userid', upload.single("blogImgFile"), verifyUserMiddleware, loadUserMiddleware, updateBlog);

export default blogRouter;
