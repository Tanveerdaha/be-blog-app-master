import express from "express";
const commentRouter = express.Router();
import { addComment, getComment, likeTheComment, deleteComment, editComment, getAllComments, getCommentsOnMyBlogs } from "../controller/commentController.js";
import verifyUserMiddleware from "../middleware/verifyUserMiddleware.js";
import verifyAdminMiddleware from "../middleware/verifyAdminMiddleware.js";
import loadUserMiddleware from "../middleware/loadUserMiddleware.js";

commentRouter
    .post('/add-comment', verifyUserMiddleware, addComment)
    .get('/get-comment/:blogId', getComment)
    .get('/my-blog-comments', verifyUserMiddleware, getCommentsOnMyBlogs)
    .put('/like-the-comment/:commentId', verifyUserMiddleware, likeTheComment)
    .delete('/delete-comment/:commentId', verifyUserMiddleware, loadUserMiddleware, deleteComment)
    .put('/edit-comment/:commentId', verifyUserMiddleware, loadUserMiddleware, editComment)
    .get('/get-all-comments', verifyUserMiddleware, verifyAdminMiddleware, getAllComments);

export default commentRouter;
