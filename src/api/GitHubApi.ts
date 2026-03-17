//Make a call to the GitHub API to get Copilot Metrics
//Support the new /copilot/metrics API (with per-model breakdown) and fall back to /copilot/usage
//Add the header Accept: application/vnd.github+json to the request
//Add also the Authorization: Bearer <token> header
//Also add X-GitHub-Api-Version: 2022-11-28 header
//Return the response from the API

import axios from "axios";

import { Metrics } from "../model/Metrics";
import { CopilotMetrics } from "../model/Copilot_Metrics";
import { convertToMetrics } from "../model/MetricsToUsageConverter";
import organizationMockedResponse from '../assets/organization_metrics_response_sample.json';
import enterpriseMockedResponse from '../assets/enterprise_metrics_response_sample.json';
import config from '../config';

export const getMetricsApi = async (): Promise<Metrics[]> => {

  let response;
  let metricsData;

  if (config.mockedData) {
    console.log("Using mock data. Check VUE_APP_MOCKED_DATA variable.");
    const rawData = config.scope.type === "organization" ? organizationMockedResponse : enterpriseMockedResponse;
    const copilotMetrics = (rawData as any[]).map((item: any) => new CopilotMetrics(item));
    metricsData = convertToMetrics(copilotMetrics);
  } else {
    // Try the new /copilot/metrics endpoint first (supports per-model breakdown)
    try {
      response = await axios.get(
        `${config.github.apiUrl}/copilot/metrics`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${config.github.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      const copilotMetrics = response.data.map((item: any) => new CopilotMetrics(item));
      metricsData = convertToMetrics(copilotMetrics);
    } catch (newApiError: any) {
      // Fall back to the legacy /copilot/usage endpoint if the new one is unavailable
      if (newApiError.response && (newApiError.response.status === 404 || newApiError.response.status === 422)) {
        console.log("New /copilot/metrics endpoint not available, falling back to /copilot/usage");
        response = await axios.get(
          `${config.github.apiUrl}/copilot/usage`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${config.github.token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
        metricsData = response.data.map((item: any) => new Metrics(item));
      } else {
        throw newApiError;
      }
    }
  }
  return metricsData;
};

export const getTeams = async (): Promise<string[]> => {
  const response = await axios.get(`${config.github.apiUrl}/teams`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.github.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  return response.data;
}

export const getTeamMetricsApi = async (): Promise<Metrics[]> => {
  console.log("config.github.team: " + config.github.team);

  if (config.github.team && config.github.team.trim() !== '') {
    // Try the new /copilot/metrics endpoint first
    try {
      const response = await axios.get(
        `${config.github.apiUrl}/team/${config.github.team}/copilot/metrics`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${config.github.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      const copilotMetrics = response.data.map((item: any) => new CopilotMetrics(item));
      return convertToMetrics(copilotMetrics);
    } catch (newApiError: any) {
      // Fall back to the legacy /copilot/usage endpoint
      if (newApiError.response && (newApiError.response.status === 404 || newApiError.response.status === 422)) {
        console.log("New /copilot/metrics endpoint not available for team, falling back to /copilot/usage");
        const response = await axios.get(
          `${config.github.apiUrl}/team/${config.github.team}/copilot/usage`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${config.github.token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
        return response.data.map((item: any) => new Metrics(item));
      } else {
        throw newApiError;
      }
    }
  }
  
  return [];

}