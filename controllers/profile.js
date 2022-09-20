const User = require('../models/User')
const { Climb, PartnerSearch } = require('../models/Post');

module.exports = {
    getProfile: async (req, res) => {
        if (req.query.myProfileBtn) {
            res.redirect(`/user/${req.user.username}`)
        }

        const user = await User.findOne({ username: req.params.username })

        // DISPLAY ERROR IF THE USER INPUTS A URL THATS NOT AN ACTUAL USER
        if (!user) return res.sendStatus(404);

        const climbs = await Climb.find({ user: req.user.id })
        const partnerSearches = await PartnerSearch.find({ user: req.user.id })

        // check to see if the current user is requesting their own profile
        const isCurrentUser = req.user.username === req.params.username

        let following = false;
        if (!isCurrentUser) {
            // check to see if the user is following the account they are requesting
            following = req.user.profile.following.some(userId => userId.toString() === user._id.toString())
        }

        res.render('profile', { user, climbs, partnerSearches, isCurrentUser, following })
    },
    getEditProfile: async (req, res) => {
        try {
            const isCurrentUser = req.user.username === req.params.username
            if (!isCurrentUser) return res.redirect(`user/${req.params.username}`)

            res.render('edit-profile', { user: req.user })
        } catch (err) {
            console.error(err)
        }
    },
    updateProfile: async (req, res) => {
        try {
            if (req.params.username !== req.user.username) return res.redirect(`/user/${req.user.username}`)

            console.log(req.body)

            const user = User.find({ _id: req.user._id })

            if (req.body.location) user.profile.location = req.body.location
            if (req.body.name) user.profile.location = req.body.name
            if (req.body.about) user.profile.about = req.body.about

            res.redirect(`/user/${req.user.username}`)
        } catch (err) {
            console.error(err)
        }

    },
    follow: async (req, res) => {
        try {
            const currentUser = await User.findOne({ _id: req.user._id })
            const userToFollow = await User.findOne({ username: req.params.username })

            if (!currentUser.profile.following.includes(userToFollow._id)) {
                currentUser.profile.following.push(userToFollow._id)
                userToFollow.profile.followers.push(currentUser._id)

                currentUser.save()
                userToFollow.save()
            }

            res.redirect(`/user/${req.params.username}`)
        } catch (err) {
            console.error(err)
        }
    },
    unfollow: async (req, res) => {
        try {
            const currentUser = await User.findOne({ _id: req.user._id })
            const userToFollow = await User.findOne({ username: req.params.username })

            if (currentUser.profile.following.includes(userToFollow._id)) {
                const currentUserArr = currentUser.profile.following
                const userToFollowArr = userToFollow.profile.followers


                currentUserArr.splice(currentUserArr.indexOf(userToFollow._id), 1)
                userToFollowArr.splice(userToFollowArr.indexOf(currentUser._id), 1)

                currentUser.save()
                userToFollow.save()
            }

            res.redirect(`/user/${req.params.username}`)
        } catch (err) {
            console.error(err)
        }
    },
}