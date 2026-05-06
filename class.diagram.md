```mermaid
classDiagram
    class Profile {
        - id UUID
        - name TEXT
        - avatar_url TEXT
        - rating NUMERIC
        - reviews_count INTEGER
        - verified BOOLEAN
        - member_since TEXT
        - response_rate INTEGER
        - location TEXT
        - bio TEXT
        - created_at TIMESTAMPTZ
        - followers_count INTEGER
        - following_count INTEGER
        + fetchProfile(profileId)
        + updateProfile(profileId, updates)
        + followUser(followerId, followedId)
        + unfollowUser(followerId, followedId)
        + checkIsFollowing(followerId, followedId)
        + fetchFollowCounts(userId)
        + fetchUserReviewsReceived(userId)
    }

    class Item {
        - id UUID
        - owner_id UUID
        - title TEXT
        - images TEXT[]
        - price_per_day NUMERIC
        - location TEXT
        - lat NUMERIC
        - lng NUMERIC
        - category TEXT
        - description TEXT
        - available BOOLEAN
        - rating NUMERIC
        - total_rentals INTEGER
        - features TEXT[]
        - created_at TIMESTAMPTZ
        - likes_count INTEGER
        + fetchItems(category, search)
        + fetchMyListings(ownerId)
        + fetchItemById(id)
        + createItem(item)
        + updateItem(itemId, updates)
        + deleteItem(itemId)
        + fetchRentalsForItem(itemId)
        + fetchReviews(itemId)
        + fetchItemLikesCount(itemId)
        + fetchUserLikedItemIds(userId)
        + fetchLikedItems(userId)
    }

    class Rental {
        - id UUID
        - item_id UUID
        - renter_id UUID
        - start_date DATE
        - end_date DATE
        - insurance_tier TEXT
        - total_price NUMERIC
        - status TEXT
        - created_at TIMESTAMPTZ
        + createRental(rental)
        + fetchMyRentals(renterId)
        + fetchIncomingRentals(ownerId)
        + updateRentalStatus(rentalId, status)
        + completeRental(rentalId, itemId)
        + checkCanReviewItem(itemId, userId)
    }

    class Message {
        - id UUID
        - sender_id UUID
        - receiver_id UUID
        - item_id UUID
        - content TEXT
        - read BOOLEAN
        - created_at TIMESTAMPTZ
        + fetchInbox(userId)
        + sendMessage(msg)
        + markMessageAsRead(messageId)
        + subscribeToMessages(userId, onUpdate)
    }

    class Follow {
        - id UUID
        - follower_id UUID
        - followed_id UUID
        - created_at TIMESTAMPTZ
        + followUser(followerId, followedId)
        + unfollowUser(followerId, followedId)
        + checkIsFollowing(followerId, followedId)
        + fetchFollowCounts(userId)
    }

    class Like {
        - id UUID
        - user_id UUID
        - item_id UUID
        - created_at TIMESTAMPTZ
        + likeItem(userId, itemId)
        + unlikeItem(userId, itemId)
        + fetchUserLikedItemIds(userId)
        + fetchLikedItems(userId)
        + fetchItemLikesCount(itemId)
    }

    class Notification {
        - id UUID
        - user_id UUID
        - actor_id UUID
        - type TEXT
        - item_id UUID
        - read BOOLEAN
        - created_at TIMESTAMPTZ
        + fetchNotifications(userId)
        + markNotificationsAsRead(userId)
    }

    class Review {
        - id UUID
        - item_id UUID
        - reviewer_id UUID
        - rating INTEGER
        - comment TEXT
        - created_at TIMESTAMPTZ
        + checkCanReviewItem(itemId, userId)
        + fetchReviews(itemId)
        + createReview(review)
    }

    class UserReview {
        - id UUID
        - rental_id UUID
        - reviewer_id UUID
        - reviewed_id UUID
        - role TEXT
        - rating INTEGER
        - comment TEXT
        - created_at TIMESTAMPTZ
        + createUserReview(review)
        + fetchUserReviewsForRental(rentalId)
        + fetchUserReviewsReceived(userId)
    }

    Profile "1" -- "0..*" Item : owns
    Profile "1" -- "0..*" Rental : rents
    Item "1" -- "0..*" Rental : rented_by
    Profile "1" -- "0..*" Message : sends
    Profile "1" -- "0..*" Message : receives
    Item "0..1" -- "0..*" Message : related_to
    Profile "1" -- "0..*" Follow : follower
    Profile "1" -- "0..*" Follow : followed
    Profile "1" -- "0..*" Like : likes
    Item "1" -- "0..*" Like : liked_by
    Profile "1" -- "0..*" Notification : receives
    Profile "1" -- "0..*" Notification : acts_as_actor
    Item "0..1" -- "0..*" Notification : references

    Review "0..*" -- "0..1" Message: make review 

    UserReview "0..*" -- "0..1" Message: make review 