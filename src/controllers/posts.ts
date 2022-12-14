import User from '../models/User'
import Profile from '../models/Profile'
import Post from '../models/Post'
import Comment from '../models/Comment'
import cloudinary from '../middleware/cloudinary'
import { ProfileType } from '../models/Profile'
import moment from 'moment'
moment().format()

export default {
  getFeed: async (req, res) => {
    try {
      // populate the user properties of posts, and then the profile properties within those user documents, then convert their types defined in the interface from ObjectId's to the corresponding interface type.
      const posts = await Post.find().populate<{ user: { profile: ProfileType } }>({ path: 'user', populate: { path: 'profile' } })

      res.render('feed', { user: req.user, posts })
    } catch (err) {
      console.error(err)
      res.redirect(`/user/${req.user.username}`)
    }
  },
  getFollowing: async (req, res) => {
    try {
      const profile = await Profile.findOne({ user: req.user._id })
      if (!profile) throw 'Profile could not be found'

      // loop through all the accounts followed and gather the posts they've made
      const following = await Promise.all(profile.following.map(async userId => {
        const followedProfile = await Profile.findOne({ user: userId }).populate('posts')
        return followedProfile
      }))

      res.render('following', { user: req.user, following })
    } catch (err) {
      console.error(err)
      res.redirect(`/user/${req.user.username}`)
    }
  },
  getPost: async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id })
    if (!post) throw 'Post was not found'

    const user = await User.findOne({ _id: post?.user }).populate('profile')
    const date = await formatDate(post?.createdAt)
    const currentUsersId = req.user._id
    const profile = await Profile.findOne({ user: req.user.id })
    const userLikedPost = profile?.likes.some(like => like.toString() === req.params.id.toString())

    const comments = await Promise.all(post.comments.map(async (comment_id) => {
      const comment = await Comment.findOne({ _id: comment_id })
      const user = await User.findOne({ _id: comment?.user }).populate('profile')

      return await {
        comment,
        id: String(comment_id),
        postId: String(comment?.post),
        user,
        date: moment(comment?.createdAt).fromNow()
      }
    }))

    res.render('post', { user, post, comments, date, currentUsersId, userLikedPost })
  },
  createPost: async (req, res) => {
    try {
      const profile = await Profile.findOne({ user: req.user.id })
      if (!profile) throw 'Profile was not found'

      // Upload image to cloudinary
      const { secure_url, public_id } = await cloudinary.v2.uploader.upload(req.file.path)

      const post = await Post.create({
        title: req.body.title,
        caption: req.body.caption,
        grade: req.body.grade,
        image: {
          url: secure_url,
          id: public_id
        },
        rating: req.body.rating,
        user: req.user.id,
        comments: [],
      })

      profile.posts.push(post._id)
      profile.save()

      console.log("Post has been created!")
      res.redirect(`/user/${req.user.username}`)
    } catch (err) {
      console.log(err)
      res.redirect(`/user/${req.user.username}`)
    }
  },
  deletePost: async (req, res) => {
    try {
      const postId = req.params.id
      // Find post by id
      const post = await Post.findById({ _id: postId })
      if (!post) throw 'Post was not found'

      // throw error if the current user does not own the post
      if (post.user?.toString() !== req.user._id.toString()) throw 'Post does not belong to current user'

      // Delete image from cloudinary
      await cloudinary.v2.uploader.destroy(post.image?.id || '')

      // Delete post and comments from db
      await Post.deleteOne({ _id: postId })
      await Comment.deleteOne({ post: postId })

      console.log("Deleted User's Post")
      res.redirect(`/user/${req.user.username}`)
    } catch (err) {
      console.error(err)
      res.redirect(`/posts/${req.params.id}`)
    }
  },
  likePost: async (req, res) => {
    try {
      await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $push: { likes: req.params.id } }
      )

      await Post.findOneAndUpdate(
        { _id: req.params.id },
        { $inc: { likes: 1 } }
      )

      res.redirect(`/posts/${req.params.id}`)
    } catch (err) {
      console.error('In likePost ', err)
      res.redirect(`/posts/${req.params.id}`)
    }
  },
  unlikePost: async (req, res) => {
    try {
      await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $pull: { likes: req.params.id } }
      )

      await Post.findOneAndUpdate(
        { _id: req.params.id },
        { $inc: { likes: -1 } }
      )

      res.redirect(`/posts/${req.params.id}`)
    } catch (err) {
      console.error('In unlikePost ', err)
      res.redirect(`/posts/${req.params.id}`)
    }
  }
}

function formatDate(date) {
  // converts date month into short hand representation example: "Mar" for "March"
  const month = date.toLocaleString('default', { month: 'short' })
  const day = date.getDay()
  const year = date.getFullYear()
  const hours = ((date.getHours() % 11) % 12 + 1)
  const minutes = date.getMinutes()
  const timePeriod = date.getHours() <= 12 ? 'AM' : 'PM'
  return `${month} ${day} ${year} at ${hours}:${minutes} ${timePeriod}`
}