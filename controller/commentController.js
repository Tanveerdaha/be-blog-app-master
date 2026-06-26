import commentModel from "../model/commentModel.js";
import errorHandler from "../utils/errorHandler.js";
import asyncHandler from 'express-async-handler';
import userModel from '../model/userModel.js';
import blogModel from "../model/blogModel.js";

const enrichComments = async (comments) => {
    return Promise.all(
        comments.map(async (comment) => {
            const commentData = comment.toObject ? comment.toObject() : comment;
            const user = await userModel.findById(commentData.userId).select('username profilePicture');

            return {
                ...commentData,
                username: user?.username || 'Unknown',
                profilePicture: user?.profilePicture || '',
            };
        })
    );
};

const deleteCommentTree = async (commentId) => {
    const children = await commentModel.find({ parentId: commentId.toString() });

    for (const child of children) {
        await deleteCommentTree(child._id);
    }

    await commentModel.findByIdAndDelete(commentId);
};

export const addComment = asyncHandler(async (req, res, next) => {
    const { userId, blogId, comment, parentId } = req.body;

    if (req.user.id !== userId) {
        return next(errorHandler('Unauthorized user!', 401));
    }

    if (parentId) {
        const parentComment = await commentModel.findById(parentId);

        if (!parentComment || parentComment.blogId !== blogId) {
            return next(errorHandler('Invalid reply target', 400));
        }
    }

    try {
        const createComment = new commentModel({
            userId,
            blogId,
            comment,
            parentId: parentId || null
        });

        await createComment.save();

        const [enrichedComment] = await enrichComments([createComment]);

        return res.status(200).json({
            success: true,
            message: 'Comment has been added ',
            comment: enrichedComment
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const getComment = asyncHandler(async (req, res, next) => {
    const { blogId } = req.params;

    try {
        const comments = await commentModel.find({ blogId }).sort({ createdAt: 1 });

        if (comments.length === 0) {
            return res.status(200).json([]);
        }

        const enrichedComments = await enrichComments(comments);
        return res.status(200).json(enrichedComments);
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const likeTheComment = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;
    const { user } = req.body;

    const comment = await commentModel.findById(commentId);

    if (!comment) {
        return next(errorHandler('Comment not found !', 404));
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

export const deleteComment = asyncHandler(async (req, res, next) => {
    const { id } = req.user;
    const { commentId } = req.params;

    const comment = await commentModel.findById(commentId);

    if (!comment) {
        return next(errorHandler('Comment not found!', 404));
    }

    const blog = await blogModel.findById(comment.blogId);
    const isCommentOwner = comment.userId.toString() === id;
    const isBlogOwner = blog && blog.userId.toString() === id;
    const isAdmin = req.dbUser?.isAdmin;

    if (!isCommentOwner && !isBlogOwner && !isAdmin) {
        return next(errorHandler('You are not authorized to delete!', 401));
    }

    await deleteCommentTree(commentId);

    return res.status(200).json({
        success: true,
        message: 'Comment has been deleted'
    });
});

export const editComment = asyncHandler(async (req, res, next) => {
    const { comment } = req.body;
    const { commentId } = req.params;
    const { id } = req.user;

    const existingComment = await commentModel.findById(commentId);

    if (!existingComment) {
        return next(errorHandler('Comment not found!', 404));
    }

    const isOwner = existingComment.userId.toString() === id.toString();
    const isAdmin = req.dbUser?.isAdmin;

    if (!isOwner && !isAdmin) {
        return next(errorHandler('Unauthorized', 401));
    }

    const updateComment = await commentModel.findByIdAndUpdate(
        existingComment._id,
        { comment },
        { new: true }
    );

    const [enrichedComment] = await enrichComments([updateComment]);
    return res.status(200).json(enrichedComment);
});

export const getCommentsOnMyBlogs = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id.toString();

        let ownedBlogs = await blogModel.find({ userId }).select('_id blogTitle slug userId');

        if (ownedBlogs.length === 0) {
            const allBlogs = await blogModel.find({}).select('_id blogTitle slug userId');
            ownedBlogs = allBlogs.filter((blog) => blog.userId?.toString() === userId);
        }

        const blogIds = ownedBlogs.map((blog) => blog._id.toString());

        if (blogIds.length === 0) {
            return res.status(200).json({
                success: true,
                comments: [],
                countDocument: 0
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const comments = await commentModel.find({ blogId: { $in: blogIds } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const blogMap = Object.fromEntries(
            ownedBlogs.map((blog) => [blog._id.toString(), blog])
        );

        const commentsWithDetails = await Promise.all(
            comments.map(async (comment) => {
                const commentData = comment.toObject();
                const commentUser = await userModel.findById(commentData.userId).select('username profilePicture');
                const blog = blogMap[commentData.blogId?.toString()];

                return {
                    ...commentData,
                    username: commentUser?.username || 'Unknown',
                    profilePicture: commentUser?.profilePicture || '',
                    blogTitle: blog?.blogTitle || 'Unknown blog',
                    blogSlug: blog?.slug || '',
                };
            })
        );

        const countDocument = await commentModel.countDocuments({ blogId: { $in: blogIds } });

        return res.status(200).json({
            success: true,
            comments: commentsWithDetails,
            countDocument
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});

export const getAllComments = asyncHandler(async (req, res, next) => {
    try {
        const startPageIndex = parseInt(req.query.page) || 1;
        const limitComments = parseInt(req.query.limitComments) || 8;
        const sortCommentsDirection = req.query.sort === '1' || req.query.sort === 'asc' ? 'asc' : 'desc';

        const comments = await commentModel.find()
            .sort({ createdAt: sortCommentsDirection })
            .skip((startPageIndex - 1) * limitComments)
            .limit(limitComments);

        const commentsWithDetails = await Promise.all(
            comments.map(async (comment) => {
                const user = await userModel.findById(comment.userId).select("username");
                const blog = await blogModel.findById(comment.blogId).select("blogTitle slug");

                return {
                    ...comment._doc,
                    username: user?.username,
                    blogTitle: blog?.blogTitle,
                    blogSlug: blog?.slug,
                };
            })
        );

        const countAllComments = await commentModel.countDocuments();

        const currentDate = new Date();
        const oneMonthAgo = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            currentDate.getDate()
        );

        const lastMonthComment = await commentModel.countDocuments({
            createdAt: { $gte: oneMonthAgo }
        });

        return res.status(200).json({
            success: true,
            comments: commentsWithDetails,
            countDocument: countAllComments,
            lastMonthComment
        });
    } catch (error) {
        return next(errorHandler(error.message, 400));
    }
});
