import type { RecordedGPSPoint } from './api/trackingService';

export interface TelemetryLogEntry {
  timestamp: number;
  timeISO: string;
  source: 'GNSS' | 'DEAD_RECKONING' | 'SENSOR_IMU';
  lat?: number;
  lng?: number;
  accuracyM?: number;
  speedKmH?: number;
  headingDeg?: number;
  ax?: number;
  ay?: number;
  az?: number;
  pitch?: number;
  roll?: number;
  yaw?: number;
}

export const LogExportService = {
  /**
   * Generates and triggers download of a genuine CSV file from real collected telemetry & tracking data.
   * Returns false if there is no data to export.
   */
  exportSessionToCSV(
    points: RecordedGPSPoint[],
    sessionMetadata?: {
      origin?: string;
      destination?: string;
      startTime?: number;
      endTime?: number;
      totalDistanceKm?: number;
    }
  ): { success: boolean; message: string; filename?: string } {
    if (!points || points.length === 0) {
      return {
        success: false,
        message: 'No data available for export. Start a live navigation session to collect telemetry.',
      };
    }

    const rows: string[] = [];

    // Optional session metadata header comments
    if (sessionMetadata) {
      if (sessionMetadata.origin) rows.push(`# Origin: ${sessionMetadata.origin}`);
      if (sessionMetadata.destination) rows.push(`# Destination: ${sessionMetadata.destination}`);
      if (sessionMetadata.totalDistanceKm) rows.push(`# Distance: ${sessionMetadata.totalDistanceKm} km`);
      if (sessionMetadata.startTime) rows.push(`# Session Start: ${new Date(sessionMetadata.startTime).toISOString()}`);
    }

    // CSV Header row
    const headers = [
      'Timestamp_Epoch_Ms',
      'Time_ISO',
      'Source_Type',
      'Latitude',
      'Longitude',
      'Accuracy_Meters',
      'Speed_KmH',
      'Heading_Deg',
      'Altitude_Meters',
      'Is_Dead_Reckoning',
    ];

    rows.push(headers.join(','));

    for (const pt of points) {
      const row = [
        pt.timestamp,
        new Date(pt.timestamp).toISOString(),
        pt.isDeadReckoning ? 'DEAD_RECKONING' : 'GNSS',
        pt.lat !== undefined ? pt.lat.toFixed(6) : '',
        pt.lng !== undefined ? pt.lng.toFixed(6) : '',
        pt.accuracyMeters !== undefined ? pt.accuracyMeters.toFixed(1) : '',
        pt.speedKmH !== undefined ? pt.speedKmH.toFixed(1) : '',
        pt.headingDeg !== undefined ? pt.headingDeg.toFixed(1) : '',
        pt.altitudeMeters !== undefined && pt.altitudeMeters !== null ? pt.altitudeMeters.toFixed(1) : '',
        pt.isDeadReckoning ? 'TRUE' : 'FALSE',
      ];
      rows.push(row.join(','));
    }

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `reckonx_telemetry_log_${timestampStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Exported ${points.length} genuine telemetry points to ${filename}`,
      filename,
    };
  },
};
