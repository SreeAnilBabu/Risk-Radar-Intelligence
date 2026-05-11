import { postBriefing, postQuery } from "../../services/endpoints";

export function fetchDailyBriefing() {
  return postBriefing("daily");
}

export function submitRiskQuestion(question: string) {
  return postQuery(question);
}
