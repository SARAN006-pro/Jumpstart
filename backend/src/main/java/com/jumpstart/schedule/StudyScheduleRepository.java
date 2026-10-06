package com.jumpstart.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StudyScheduleRepository extends JpaRepository<StudySchedule, Long> {
    List<StudySchedule> findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(Long userId, LocalDate start, LocalDate end);
    List<StudySchedule> findByUserIdOrderByScheduledDateAsc(Long userId);
    Optional<StudySchedule> findByUserIdAndTopicIdAndScheduledDate(Long userId, Long topicId, LocalDate date);
    List<StudySchedule> findByScheduledDate(LocalDate date);
}
