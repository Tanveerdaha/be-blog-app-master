import commentModel from "../model/commentModel.js";
import errorHandler from "../utils/errorHandler.js";
import asyncHandler from 'express-async-handler';
import userModel from '../model/userModel.js';
import blogModel from "../model/blogModel.js";



// POST API : add comment - 

export const addComment = asyncHandler(async (req, res, next) => {

    const { userId, blogId, comment } = req.body;

    try {

        if (req.user.id !== userId) {
            return next('Unauthorized user!', 401);
        }

        const createComment = new commentModel({
            userId,
            blogId,
            comment
        });

        await createComment.save();

        return res.status(200).json({
            success: true,
            message: 'Comment has been added ',
            comment: createComment
        })

    } catch (error) {
        return next(error.message, 400);
    }
})


// GET API  : find user who comment -

export const getComment = asyncHandler(async (req, res, next) => {

    const { blogId } = req.params;

    try {
        const comments = await commentModel.find({ blogId: blogId });

        if (comments.length === 0) {
            return next(errorHandler('No comments found!', 404));
        }
        return res.status(200).json(comments);
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
})


// PUT API  : Add and remove like - 

export const likeTheComment = asyncHandler(async (req, res, next) => {

    const { commentId } = req.params;
    const { user } = req.body;


    const comment = await commentModel.findById(commentId);

    if (!comment) {
        return next('Comment not found !', 404);
    }

    const userIndex = comment.likes.indexOf(user);

    if (userIndex === -1) {
        comment.likes.push(user);
        comment.numberOfLikes += 1;
    } else {
        comment.likes.splice(userIndex, 1);
        comment.numberOfLikes -= 1;
    }

    await comment.save();

    return res.status(200).json(comment);
});



// DELETE API : Delete comment : 

export const deleteComment = asyncHandler(async (req, res, next) => {

    const { id } = req.user;
    const { commentId } = req.params;
    const { isAdmin } = req.body.user;

    try {
        const findComment = await commentModel.find({ _id: commentId });

        if (findComment.length === 0) {
            return next(errorHandler('Comment not found!', 404));
        }
        if (findComment.userId !== id && !isAdmin) {
            return next(errorHandler('You are not authorized to delete!', 401));
        }

        await commentModel.findByIdAndDelete(findComment);

        return res.status(200).json({
            success: true,
            message: 'Comment has been deleted'
        })

    } catch (error) {
        return next(error.message, 400);
    }
});




// PUT API : Edit comment - 

export const editComment = asyncHandler(async (req, res, next) => {

    const { currentUser } = req.body
    const { comment } = req.body;
    const { commentId } = req.params;
    const { id } = req.user;

    try {
        const Findcomment = await commentModel.findById(commentId);

        if (!Findcomment) {
            return next(errorHandler('Comment not found!', 404));
        }

        if (Findcomment.userId.toString() !== id.toString() && currentUser.isAdmin === false) {
            // Deny delete
        }

        const updateComment = await commentModel.findByIdAndUpdate(Findcomment._id, { comment: comment }, { new: true });
        return res.status(200).json(updateComment);


    } catch (error) {
        return next(errorHandler(error.message, error, 400));
    }
});


export const getAllComments = asyncHandler(async (req, res, next) => {


    try {
        const startPageIndex = parseInt(req.query.page) || 1;
        const limitComments = parseInt(req.query.limitComments) || 8;
        const sortCommentsDirection = req.query.sort === 1 ? 'asc' : 'desc';

        const comments = await commentModel.find()
            .sort({ createdAt: sortCommentsDirection })
            .skip((startPageIndex - 1) * limitComments)
            .limit(limitComments)

        const commentsWithDetails = await Promise.all(
            comments.map(async (comment) => {
            const user = await userModel.findById(comment.userId).select("username");
            const blog = await blogModel.findById(comment.blogId).select("blogTitle");

            return {
                ...comment._doc,
                username: user?.username,
                blogTitle: blog?.blogTitle,
            };
        })
    );

        const countAllComments = await commentModel.countDocuments();

        const currentDate = new Date();

        const oneMonthAgo = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            currentDate.getDate()
        )

        const lastMonthComment = await commentModel.countDocuments({
            createdAt: { $gte: oneMonthAgo }
        });

        return res.status(200).json({
            success: true,
            comments: commentsWithDetails,
            countDocument: countAllComments,
            lastMonthComment: lastMonthComment
        })

    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
})