package com.jumpstart.topic.timer;

import com.jumpstart.common.exception.ForbiddenException;
import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.goal.GoalService;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimerService {

    private final TopicTimerStateRepository stateRepository;
    private final TopicTimerSessionRepository sessionRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final GoalService goalService;

    @Transactional(readOnly = true)
    public TimerStatusDTO getActive(Long userId) {
        return stateRepository.findByUserIdAndStatus(userId, "RUNNING")
                .map(TimerStatusDTO::from)
                .orElse(null);
    }

    @Transactional
    public TimerStatusResponse start(Long topicId, Long userId, Role role) {
        Topic topic = loadTopic(topicId, userId, role);
        User user = userRepository.findById(userId).orElseThrow();
        var state = stateRepository.findByTopicIdAndUserId(topicId, userId)
                .orElse(TopicTimerState.builder().topic(topic).user(user).build());
        state.setStatus("RUNNING");
        state.setServerStartTime(Instant.now());
        stateRepository.save(state);
        return new TimerStatusResponse("RUNNING", state.getServerStartTime(), state.getAccumulatedSeconds(), Instant.now());
    }

    @Transactional
    public TimerStatusResponse pause(Long topicId, Long userId, Role role) {
        loadTopic(topicId, userId, role);
        var state = stateRepository.findByTopicIdAndUserId(topicId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Timer", topicId));
        if ("RUNNING".equals(state.getStatus()) && state.getServerStartTime() != null) {
            int elapsed = (int) (Instant.now().getEpochSecond() - state.getServerStartTime().getEpochSecond());
            state.setAccumulatedSeconds(state.getAccumulatedSeconds() + elapsed);
        }
        state.setStatus("PAUSED");
        state.setServerStartTime(null);
        stateRepository.save(state);
        return new TimerStatusResponse("PAUSED", null, state.getAccumulatedSeconds(), Instant.now());
    }

    @Transactional
    public TimerStatusResponse stop(Long topicId, Long userId, Role role) {
        loadTopic(topicId, userId, role);
        var state = stateRepository.findByTopicIdAndUserId(topicId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Timer", topicId));
        int totalSeconds = state.getAccumulatedSeconds();
        Instant startedAt = state.getServerStartTime();
        if ("RUNNING".equals(state.getStatus()) && state.getServerStartTime() != null) {
            totalSeconds += (int) (Instant.now().getEpochSecond() - state.getServerStartTime().getEpochSecond());
        }
        sessionRepository.save(TopicTimerSession.builder()
                .topic(state.getTopic()).user(state.getUser())
                .startTime(startedAt)
                .endTime(Instant.now())
                .durationSeconds(totalSeconds - state.getAccumulatedSeconds())
                .isManual(false)
                .createdAt(Instant.now())
                .build());
        state.setStatus("STOPPED");
        state.setServerStartTime(null);
        state.setAccumulatedSeconds(0);
        stateRepository.save(state);
        goalService.checkAndCompleteGoalFromTimer(userId, topicId);
        return new TimerStatusResponse("STOPPED", null, totalSeconds, Instant.now());
    }

    public TimerStatusResponse status(Long topicId, Long userId, Role role) {
        loadTopic(topicId, userId, role);
        var opt = stateRepository.findByTopicIdAndUserId(topicId, userId);
        if (opt.isPresent()) {
            var s = opt.get();
            return new TimerStatusResponse(s.getStatus(), s.getServerStartTime(), s.getAccumulatedSeconds(), Instant.now());
        }
        return new TimerStatusResponse("STOPPED", null, 0, Instant.now());
    }

    @Transactional
    public void logManual(Long topicId, TimerLogRequest request, Long userId, Role role) {
        Topic topic = loadTopic(topicId, userId, role);
        User user = userRepository.findById(userId).orElseThrow();
        sessionRepository.save(TopicTimerSession.builder()
                .topic(topic).user(user)
                .durationSeconds(request.durationSeconds())
                .note(request.note())
                .isManual(true)
                .createdAt(Instant.now())
                .build());
        goalService.checkAndCompleteGoalFromTimer(userId, topicId);
    }

    public List<TopicTimerSession> history(Long topicId, Long userId, Role role) {
        loadTopic(topicId, userId, role);
        return sessionRepository.findByTopicIdAndUserIdOrderByCreatedAtDesc(topicId, userId);
    }

    private Topic loadTopic(Long topicId, Long userId, Role role) {
        Topic topic = topicRepository.findByIdWithRoadmapAndOwner(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic", topicId));
        if (role != Role.ADMIN && !topic.getRoadmap().getOwner().getId().equals(userId)) {
            throw new ForbiddenException("You do not have access to this topic");
        }
        return topic;
    }
}
