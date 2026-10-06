package com.jumpstart.topic.progress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TopicProgressRepository extends JpaRepository<TopicProgress, Long> {

    Optional<TopicProgress> findByUserIdAndTopicId(Long userId, Long topicId);

    List<TopicProgress> findByUserId(Long userId);

    @Query("SELECT tp FROM TopicProgress tp WHERE tp.user.id = :userId AND tp.confidenceLevel < :levelThreshold AND (tp.lastRevisedAt IS NULL OR tp.lastRevisedAt < :since)")
    List<TopicProgress> findStaleTopics(
        @Param("userId") Long userId,
        @Param("levelThreshold") int levelThreshold,
        @Param("since") Instant since
    );
}
