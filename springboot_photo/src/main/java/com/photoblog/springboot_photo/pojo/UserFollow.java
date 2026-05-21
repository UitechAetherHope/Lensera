package com.photoblog.springboot_photo.pojo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "tb_user_follow",
        uniqueConstraints = @UniqueConstraint(columnNames = {"follower_id", "followee_id"})
)
public class UserFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "follower_id", nullable = false)
    private Integer followerId;

    @Column(name = "followee_id", nullable = false)
    private Integer followeeId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getFollowerId() {
        return followerId;
    }

    public void setFollowerId(Integer followerId) {
        this.followerId = followerId;
    }

    public Integer getFolloweeId() {
        return followeeId;
    }

    public void setFolloweeId(Integer followeeId) {
        this.followeeId = followeeId;
    }
}
