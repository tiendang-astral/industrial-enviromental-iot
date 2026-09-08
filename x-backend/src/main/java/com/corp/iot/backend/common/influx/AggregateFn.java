package com.corp.iot.backend.common.influx;

/**
 * Hàm gộp mẫu dùng trong câu Flux. Là enum chứ không phải chuỗi tự do vì giá trị này ghép thẳng
 * vào query — chỉ những giá trị khai ở đây mới tới được InfluxDB.
 */
public enum AggregateFn {
    MEAN("mean"),
    /** Kênh có ngưỡng dùng MAX để biểu đồ không bao giờ giấu một lần vượt ngưỡng. */
    MAX("max");

    private final String flux;

    AggregateFn(String flux) {
        this.flux = flux;
    }

    public String flux() {
        return flux;
    }
}
