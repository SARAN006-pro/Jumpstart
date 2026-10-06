package com.jumpstart.schedule.session;

import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.resource.ResourceItem;
import com.jumpstart.resource.ResourceRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ScheduleSessionService {

    private final ScheduleSessionRepository repository;
    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final ResourceRepository resourceRepository;

    @Transactional(readOnly = true)
    public List<SessionResponse> getRange(Long userId, Instant start, Instant end) {
        return repository
            .findByUserIdAndPlannedStartTimeBetweenOrderByPlannedStartTimeAsc(userId, start, end)
            .stream()
            .map(SessionResponse::from)
            .toList();
    }

    public SessionResponse getById(Long id) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));
        return SessionResponse.from(s);
    }

    @Transactional
    public SessionResponse create(SessionRequest request, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Topic topic = Optional.ofNullable(request.topicId())
            .flatMap(topicRepository::findById)
            .orElse(null);
        ResourceItem resource = Optional.ofNullable(request.resourceId())
            .flatMap(resourceRepository::findById)
            .orElse(null);

        ScheduleSession s = ScheduleSession.builder()
            .user(user)
            .title(request.title())
            .topic(topic)
            .resource(resource)
            .plannedStartTime(request.plannedStartTime())
            .plannedEndTime(request.plannedEndTime())
            .timezone(request.timezone())
            .recurrenceRule(request.recurrenceRule())
            .notes(request.notes())
            .build();
        return SessionResponse.from(repository.save(s));
    }

    @Transactional
    public SessionResponse update(Long id, SessionUpdateRequest request, Long userId) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));

        if (request.title() != null) s.setTitle(request.title());
        if (request.status() != null) s.setStatus(ScheduleSessionStatus.valueOf(request.status()));
        if (request.plannedStartTime() != null) s.setPlannedStartTime(request.plannedStartTime());
        if (request.plannedEndTime() != null) s.setPlannedEndTime(request.plannedEndTime());
        if (request.actualStartTime() != null) s.setActualStartTime(request.actualStartTime());
        if (request.actualEndTime() != null) s.setActualEndTime(request.actualEndTime());
        if (request.actualDuration() != null) s.setActualDuration(request.actualDuration());
        if (request.timezone() != null) s.setTimezone(request.timezone());
        if (request.recurrenceRule() != null) s.setRecurrenceRule(request.recurrenceRule());
        if (request.pomodoroCount() != null) s.setPomodoroCount(request.pomodoroCount());
        if (request.rating() != null) s.setRating(request.rating());
        if (request.notes() != null) s.setNotes(request.notes());
        if (request.topicId() != null) {
            Topic topic = topicRepository.findById(request.topicId())
                .orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()));
            s.setTopic(topic);
        }
        if (request.resourceId() != null) {
            ResourceItem resource = resourceRepository.findById(request.resourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", request.resourceId()));
            s.setResource(resource);
        }

        return SessionResponse.from(repository.save(s));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));
        repository.delete(s);
    }

    @Transactional
    public SessionResponse updateTimings(Long id, Instant newStart, Instant newEnd, Long userId) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));
        s.setPlannedStartTime(newStart);
        s.setPlannedEndTime(newEnd);
        return SessionResponse.from(repository.save(s));
    }

    @Transactional
    public void markComplete(Long id, Integer actualDuration) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));
        s.setStatus(ScheduleSessionStatus.COMPLETED);
        s.setActualEndTime(Instant.now());
        if (actualDuration != null) s.setActualDuration(actualDuration);
        if (s.getActualStartTime() == null) s.setActualStartTime(Instant.now());
    }

    @Transactional
    public void markSkipped(Long id) {
        ScheduleSession s = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ScheduleSession", id));
        s.setStatus(ScheduleSessionStatus.SKIPPED);
    }

    public List<SessionResponse> getDailySessions(Long userId, Instant dayStart, Instant dayEnd) {
        return repository
            .findByUserIdAndPlannedStartTimeBetweenOrderByPlannedStartTimeAsc(userId, dayStart, dayEnd)
            .stream()
            .map(SessionResponse::from)
            .toList();
    }
}
