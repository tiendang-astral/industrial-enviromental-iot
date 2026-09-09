package com.corp.iot.backend.common.influx;

/** Thống kê gộp của MỘT kênh trong một khoảng thời gian — dùng cho báo cáo môi trường. */
public record ChannelStats(long count, Double min, Double max, Double avg) {
}
