package com.jumpstart.goal;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.goal.dto.GoalRequest;
import com.jumpstart.goal.dto.GoalResponse;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.schedule.StudyScheduleRepository;
import com.jumpstart.schedule.dto.ScheduleItemResponse;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.topic.timer.TopicTimerSessionRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;
    private final TopicRepository topicRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicTimerSessionRepository timerSessionRepository;
    private final StudyScheduleRepository scheduleRepository;
    private final ScheduleSessionRepository sessionRepository;
    private final GoalEngineService goalEngine;

    @Transactional
    public GoalResponse create(GoalRequest request, Long ownerId) {
        User owner = userRepository.findById(ownerId).orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
        Topic topic = request.topicId() != null
                ? topicRepository.findById(request.topicId()).orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()))
                : null;
        Roadmap roadmap = request.roadmapId() != null
                ? roadmapRepository.findById(request.roadmapId()).orElseThrow(() -> new ResourceNotFoundException("Roadmap", request.roadmapId()))
                : null;

        Goal goal = Goal.builder()
                .owner(owner)
                .label(request.label())
                .description(request.description())
                .cadence(Cadence.valueOf(request.cadence()))
                .priority(request.priority() != null ? request.priority() : "medium")
                .status("active")
                .targetValue(request.targetValue())
                .progressValue(request.progressValue())
                .unit(request.unit())
                .metricType(request.metricType())
                .trackingType(request.trackingType())
                .dueDate(request.dueDate())
                .topic(topic)
                .linkedRoadmap(roadmap)
                .prerequisiteGoalId(request.prerequisiteGoalId())
                .unlockThreshold(request.unlockThreshold())
                .build();

        goal = goalRepository.save(goal);

        if (request.cadence().equals("LONGTERM")) {
            goalEngine.autoGenerateMilestones(goal);
        }

        return GoalResponse.from(goal, false);
    }

    public PageResponse<GoalResponse> list(Long ownerId, Cadence cadence, String status, Long topicId, Pageable pageable) {
        var page = goalRepository.findByOwnerId(ownerId, pageable);
        if (cadence != null) page = goalRepository.findByOwnerIdAndCadence(ownerId, cadence, pageable);
        else if (status != null) page = goalRepository.findByOwnerIdAndStatus(ownerId, status, pageable);
        else if (topicId != null) page = goalRepository.findByOwnerIdAndTopicId(ownerId, topicId, pageable);
        Map<Long, Goal> allMap = goalRepository.findByOwnerId(ownerId).stream()
                .collect(Collectors.toMap(Goal::getId, g -> g));
        return PageResponse.from(page.map(g -> {
            boolean locked = computeLocked(g, allMap);
            return GoalResponse.from(g, locked);
        }));
    }

    private boolean computeLocked(Goal goal, Map<Long, Goal> allGoals) {
        if (goal.getPrerequisiteGoalId() == null || goal.getUnlockThreshold() == null) return false;
        Goal prereq = allGoals.get(goal.getPrerequisiteGoalId());
        if (prereq == null) return false;
        double prereqProgress = prereq.getTargetValue() > 0
                ? prereq.getProgressValue() / prereq.getTargetValue()
                : 0;
        return prereqProgress < goal.getUnlockThreshold();
    }

    @Transactional
    public GoalResponse update(Long id, GoalRequest request, Long requesterId, Role requesterRole) {
        Goal goal = loadOwned(id, requesterId, requesterRole);
        goal.setLabel(request.label());
        goal.setDescription(request.description());
        goal.setCadence(Cadence.valueOf(request.cadence()));
        if (request.priority() != null) goal.setPriority(request.priority());
        if (request.status() != null) {
            goal.setStatus(request.status());
            if ("completed".equals(request.status()) && goal.getCompletedAt() == null) {
                goal.setCompletedAt(Instant.now());
            }
        }
        goal.setTargetValue(request.targetValue());
        goal.setProgressValue(request.progressValue());
        goal.setUnit(request.unit());
        goal.setMetricType(request.metricType());
        goal.setTrackingType(request.trackingType());
        goal.setDueDate(request.dueDate());
        if (request.topicId() != null) {
            Topic topic = topicRepository.findById(request.topicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic", request.topicId()));
            goal.setTopic(topic);
        }
        if (request.roadmapId() != null) {
            Roadmap roadmap = roadmapRepository.findById(request.roadmapId())
                    .orElseThrow(() -> new ResourceNotFoundException("Roadmap", request.roadmapId()));
            goal.setLinkedRoadmap(roadmap);
        }
        if (request.prerequisiteGoalId() != null) goal.setPrerequisiteGoalId(request.prerequisiteGoalId());
        if (request.unlockThreshold() != null) goal.setUnlockThreshold(request.unlockThreshold());
        goal = goalRepository.save(goal);
        Map<Long, Goal> allMap = goalRepository.findByOwnerId(goal.getOwner().getId()).stream()
                .collect(Collectors.toMap(Goal::getId, g -> g));
        return GoalResponse.from(goal, computeLocked(goal, allMap));
    }

    @Transactional
    public void delete(Long id, Long requesterId, Role requesterRole) {
        goalRepository.delete(loadOwned(id, requesterId, requesterRole));
    }

    private Goal loadOwned(Long id, Long requesterId, Role requesterRole) {
        Goal goal = goalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Goal", id));
        if (requesterRole != Role.ADMIN && !goal.getOwner().getId().equals(requesterId)) {
            throw new ForbiddenException("You do not have access to this goal");
        }
        return goal;
    }

    public void checkAndCompleteGoalFromTimer(Long userId, Long topicId) {
        List<Goal> goals = goalRepository.findByOwnerIdAndTopicIdAndStatus(userId, topicId, "active");
        int totalSeconds = timerSessionRepository.findByTopicIdAndUserIdOrderByCreatedAtDesc(topicId, userId).stream()
                .mapToInt(s -> s.getDurationSeconds())
                .sum();
        for (Goal goal : goals) {
            double targetMinutes = goal.getTargetValue();
            if ("hours".equalsIgnoreCase(goal.getUnit())) targetMinutes *= 60;
            if (totalSeconds >= targetMinutes * 60 && !goal.getStatus().equals("completed")) {
                goal.setProgressValue(goal.getTargetValue());
                goal.setStatus("completed");
                goal.setCompletedAt(Instant.now());
                goalRepository.save(goal);
            }
        }
    }

    public List<ScheduleItemResponse> getTodaySchedule(Long userId) {
        return scheduleRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, LocalDate.now(), LocalDate.now())
                .stream().map(ScheduleItemResponse::from).toList();
    }

    @Transactional
    public GoalResponse createDailyFromSchedule(Long userId, Long topicId, String topicTitle, int plannedMinutes) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Topic topic = topicRepository.findById(topicId).orElse(null);
        Goal goal = Goal.builder()
                .owner(user)
                .label("Study: " + topicTitle)
                .cadence(Cadence.DAILY)
                .priority("medium")
                .status("active")
                .targetValue(plannedMinutes)
                .progressValue(0)
                .unit("minutes")
                .metricType("HOURS")
                .trackingType("AUTOMATIC")
                .dueDate(LocalDate.now())
                .topic(topic)
                .build();
        return GoalResponse.from(goalRepository.save(goal), false);
    }

    public ScheduleSession loadSession(Long sessionId) {
        return sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session", sessionId));
    }
}
