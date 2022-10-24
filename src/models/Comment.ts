import mongoose from 'mongoose'

const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        maxLength: 1000
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model('Comment', CommentSchema)