"""
MCP (Model Context Protocol) Integration Service
Provides enhanced context and memory for AI models using both knowledge graphs
"""

import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, asdict

from services.knowledge_graph_service import knowledge_graph, GraphNode
from services.mcp_knowledge_graph_client import mcp_client

logger = logging.getLogger(__name__)

@dataclass
class MCPContext:
    """Context object for MCP protocol"""
    patient_id: str
    session_type: str
    current_context: Dict[str, Any]
    historical_context: List[Dict[str, Any]]
    similar_cases: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    mcp_memory: Dict[str, Any]  # Added MCP memory context
    metadata: Dict[str, Any]

class MCPMemoryProvider:
    """
    Enhanced MCP Memory Provider for PTSD Therapy
    Combines NetworkX knowledge graph with MCP Knowledge Graph tool
    """
    
    def __init__(self):
        self.knowledge_graph = knowledge_graph
        self.mcp_client = mcp_client
        
    def get_patient_context(self, patient_id: str, session_type: str = "general") -> MCPContext:
        """
        Get comprehensive MCP context for a patient using both knowledge graphs
        """
        # Get current patient context from NetworkX knowledge graph
        current_context = self.knowledge_graph.get_patient_context(patient_id)
        
        # Get MCP memory context
        mcp_memory = self.mcp_client.get_patient_context(patient_id)
        
        # Get historical patterns
        historical_context = self._extract_historical_patterns(current_context)
        
        # Find similar cases from both sources
        similar_cases_nx = self.knowledge_graph.find_similar_patients(patient_id, similarity_threshold=0.6)
        similar_cases_mcp = self.mcp_client.get_similar_patients(patient_id, similarity_threshold=0.6)
        
        # Combine and deduplicate similar cases
        similar_cases = self._merge_similar_cases(similar_cases_nx, similar_cases_mcp)
        
        # Get treatment recommendations
        recommendations = self.knowledge_graph.get_treatment_recommendations(patient_id)
        
        # Build metadata
        metadata = {
            "context_generated_at": datetime.utcnow().isoformat(),
            "total_sessions": current_context.get("total_sessions", 0),
            "last_session": current_context.get("last_session"),
            "progress_trend": current_context.get("progress_metrics", {}).get("trend", "unknown"),
            "similar_cases_count": len(similar_cases),
            "recommendations_count": len(recommendations),
            "mcp_entities_count": len(mcp_memory.get("patient_entities", [])),
            "mcp_relations_count": len(mcp_memory.get("relationships", []))
        }
        
        return MCPContext(
            patient_id=patient_id,
            session_type=session_type,
            current_context=current_context,
            historical_context=historical_context,
            similar_cases=similar_cases,
            recommendations=recommendations,
            mcp_memory=mcp_memory,
            metadata=metadata
        )
    
    def initialize_patient_memory(self, patient_id: str, patient_data: Dict[str, Any]):
        """
        Initialize patient memory in both knowledge graphs
        """
        # Initialize in NetworkX knowledge graph
        self.knowledge_graph.add_patient_node(patient_id, patient_data)
        
        # Initialize in MCP knowledge graph
        try:
            self.mcp_client.create_patient_entities(patient_id, patient_data)
            self.mcp_client.create_patient_relations(patient_id, patient_data)
            logger.info(f"Patient {patient_id} initialized in both knowledge graphs")
        except Exception as e:
            logger.error(f"Failed to initialize patient in MCP: {e}")
    
    def enhance_story_generation_context(self, patient_id: str, exposure_stage: int) -> Dict[str, Any]:
        """
        Provide enhanced context for story generation using both knowledge graphs
        """
        mcp_context = self.get_patient_context(patient_id, "story_generation")
        
        # Extract relevant information for story generation
        patient_data = mcp_context.current_context.get("patient", {}).get("properties", {})
        triggers = mcp_context.current_context.get("triggers", [])
        symptoms = mcp_context.current_context.get("symptoms", [])
        progress_metrics = mcp_context.current_context.get("progress_metrics", {})
        
        # Get MCP memory insights
        mcp_session_history = mcp_context.mcp_memory.get("session_history", [])
        
        # Get successful story patterns from similar patients
        successful_patterns = self._extract_successful_story_patterns(mcp_context.similar_cases)
        
        # Build enhanced context
        enhanced_context = {
            "patient_profile": {
                "demographics": {
                    "age": patient_data.get("age"),
                    "gender": patient_data.get("gender"),
                    "name": patient_data.get("name", "").split()[0]  # First name only
                },
                "clinical_profile": {
                    "baseline_sud": patient_data.get("baseline_sud"),
                    "pcl5_score": patient_data.get("pcl5_score"),
                    "phq9_score": patient_data.get("phq9_score"),
                    "trauma_type": patient_data.get("trauma_type")
                }
            },
            "triggers_and_symptoms": {
                "primary_triggers": [
                    {
                        "name": t["properties"]["name"],
                        "intensity": t["properties"].get("intensity", "moderate"),
                        "sud_level": t["properties"].get("sud_level", 5)
                    }
                    for t in triggers[:3]  # Top 3 triggers
                ],
                "key_symptoms": [s["properties"]["name"] for s in symptoms[:5]]
            },
            "progress_context": {
                "current_stage": exposure_stage,
                "average_sud_reduction": progress_metrics.get("average_reduction", 0),
                "trend": progress_metrics.get("trend", "stable"),
                "total_sessions": progress_metrics.get("total_sessions", 0)
            },
            "mcp_insights": {
                "session_history": mcp_session_history[-5:],  # Last 5 sessions from MCP
                "memory_patterns": self._extract_mcp_patterns(mcp_context.mcp_memory)
            },
            "successful_patterns": successful_patterns,
            "personalization_hints": self._generate_personalization_hints(mcp_context),
            "safety_considerations": self._generate_safety_considerations(mcp_context)
        }
        
        return enhanced_context
    
    def get_session_memory(self, patient_id: str, session_count: int = 5) -> Dict[str, Any]:
        """
        Get memory from recent sessions using both knowledge graphs
        """
        # Get NetworkX session memory
        nx_context = self.knowledge_graph.get_patient_context(patient_id)
        recent_sessions = nx_context.get("sessions", [])[-session_count:]
        
        # Get MCP session memory
        mcp_context = self.mcp_client.get_patient_context(patient_id)
        mcp_sessions = mcp_context.get("session_history", [])[-session_count:]
        
        session_memory = {
            "recent_sessions": [],
            "mcp_sessions": mcp_sessions,
            "patterns": {
                "sud_progression": [],
                "common_themes": [],
                "breakthrough_moments": []
            },
            "continuity_notes": [],
            "cross_graph_insights": []
        }
        
        # Process NetworkX sessions
        for session in recent_sessions:
            session_props = session.get("properties", {})
            session_memory["recent_sessions"].append({
                "date": session.get("created_at"),
                "initial_sud": session_props.get("initial_sud"),
                "final_sud": session_props.get("final_sud"),
                "reduction": (session_props.get("initial_sud", 0) - session_props.get("final_sud", 0)),
                "notes": session_props.get("therapist_notes", ""),
                "story_id": session_props.get("story_generated")
            })
            
            # Track SUD progression
            if session_props.get("initial_sud") and session_props.get("final_sud"):
                session_memory["patterns"]["sud_progression"].append({
                    "initial": session_props["initial_sud"],
                    "final": session_props["final_sud"],
                    "reduction": session_props["initial_sud"] - session_props["final_sud"]
                })
        
        # Generate continuity notes
        if len(session_memory["patterns"]["sud_progression"]) >= 2:
            recent_reductions = [s["reduction"] for s in session_memory["patterns"]["sud_progression"][-3:]]
            avg_reduction = sum(recent_reductions) / len(recent_reductions)
            
            if avg_reduction > 2:
                session_memory["continuity_notes"].append("Patient showing strong progress with consistent SUD reductions")
            elif avg_reduction > 0:
                session_memory["continuity_notes"].append("Patient making steady progress")
            else:
                session_memory["continuity_notes"].append("Patient may need adjusted approach - limited SUD reduction")
        
        # Add cross-graph insights
        if len(mcp_sessions) > 0 and len(recent_sessions) > 0:
            session_memory["cross_graph_insights"].append("Both knowledge graphs show consistent session tracking")
        
        return session_memory
    
    def update_session_memory(self, patient_id: str, session_data: Dict[str, Any]):
        """
        Update both knowledge graphs with new session data
        """
        # Update NetworkX knowledge graph
        session_node = self.knowledge_graph.add_session_node(patient_id, session_data)
        
        # Update MCP knowledge graph
        try:
            self.mcp_client.add_session_memory(patient_id, session_data)
        except Exception as e:
            logger.error(f"Failed to update MCP session memory: {e}")
        
        # If this session had good outcomes, record it in NetworkX
        if session_data.get("final_sud") and session_data.get("initial_sud"):
            reduction = session_data["initial_sud"] - session_data["final_sud"]
            if reduction >= 2:  # Significant reduction
                outcome_data = {
                    "effectiveness": min(1.0, reduction / 5.0),  # Normalize to 0-1
                    "sud_reduction": reduction,
                    "feedback": session_data.get("patient_feedback", "")
                }
                self.knowledge_graph.add_treatment_outcome(
                    patient_id, 
                    session_data.get("type", "exposure_therapy"), 
                    outcome_data
                )
        
        logger.info(f"Updated session memory for patient {patient_id} in both knowledge graphs")
    
    def get_research_context(self, patient_id: str, research_query: str) -> Dict[str, Any]:
        """
        Provide patient-specific context for research queries using both knowledge graphs
        """
        mcp_context = self.get_patient_context(patient_id, "research")
        
        # Extract relevant patient information for research context
        patient_data = mcp_context.current_context.get("patient", {}).get("properties", {})
        symptoms = [s["properties"]["name"] for s in mcp_context.current_context.get("symptoms", [])]
        triggers = [t["properties"]["name"] for t in mcp_context.current_context.get("triggers", [])]
        
        # Get MCP memory insights
        mcp_entities = mcp_context.mcp_memory.get("patient_entities", [])
        mcp_observations = []
        for entity in mcp_entities:
            mcp_observations.extend(entity.get("observations", []))
        
        research_context = {
            "patient_profile": {
                "age_group": self._get_age_group(patient_data.get("age")),
                "gender": patient_data.get("gender"),
                "trauma_type": patient_data.get("trauma_type"),
                "severity_indicators": {
                    "pcl5_score": patient_data.get("pcl5_score"),
                    "phq9_score": patient_data.get("phq9_score")
                }
            },
            "clinical_focus": {
                "primary_symptoms": symptoms[:3],
                "main_triggers": triggers[:3],
                "current_treatment_stage": "exposure_therapy"  # Could be dynamic
            },
            "mcp_insights": {
                "total_observations": len(mcp_observations),
                "recent_observations": mcp_observations[-10:],  # Last 10 observations
                "memory_depth": len(mcp_context.mcp_memory.get("relationships", []))
            },
            "research_personalization": {
                "suggested_keywords": self._generate_research_keywords(symptoms, triggers),
                "relevant_demographics": f"{patient_data.get('gender', 'adult')} {self._get_age_group(patient_data.get('age'))}",
                "treatment_context": "exposure therapy for PTSD"
            }
        }
        
        return research_context
    
    def search_memory(self, query: str) -> Dict[str, Any]:
        """
        Search across both knowledge graphs for relevant information
        """
        # Search MCP memory
        mcp_results = self.mcp_client.search_patient_memory(query)
        
        # Search NetworkX graph (simplified search)
        nx_results = []
        for node_id, node in self.knowledge_graph.nodes.items():
            if query.lower() in str(node.properties).lower() or query.lower() in node.id.lower():
                nx_results.append({
                    "id": node.id,
                    "type": node.type,
                    "properties": node.properties
                })
        
        return {
            "mcp_results": mcp_results.get("results", []),
            "nx_results": nx_results,
            "query": query,
            "total_results": len(mcp_results.get("results", [])) + len(nx_results)
        }
    
    def _merge_similar_cases(self, nx_cases: List[Dict[str, Any]], mcp_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge and deduplicate similar cases from both knowledge graphs"""
        merged_cases = {}
        
        # Add NetworkX cases
        for case in nx_cases:
            patient_id = case.get("patient_id")
            merged_cases[patient_id] = {
                "patient_id": patient_id,
                "similarity_score": case.get("similarity_score", 0),
                "source": "networkx",
                "context": case.get("context", {}),
                "nx_data": case
            }
        
        # Add or merge MCP cases
        for case in mcp_cases:
            patient_id = case.get("patient_id")
            if patient_id in merged_cases:
                # Merge data from both sources
                merged_cases[patient_id]["mcp_data"] = case
                merged_cases[patient_id]["source"] = "both"
                # Average similarity scores
                merged_cases[patient_id]["similarity_score"] = (
                    merged_cases[patient_id]["similarity_score"] + case.get("similarity_score", 0)
                ) / 2
            else:
                merged_cases[patient_id] = {
                    "patient_id": patient_id,
                    "similarity_score": case.get("similarity_score", 0),
                    "source": "mcp",
                    "mcp_data": case
                }
        
        return sorted(merged_cases.values(), key=lambda x: x["similarity_score"], reverse=True)
    
    def _extract_mcp_patterns(self, mcp_memory: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract patterns from MCP memory"""
        patterns = []
        
        session_history = mcp_memory.get("session_history", [])
        if len(session_history) >= 3:
            patterns.append({
                "type": "session_frequency",
                "pattern": "regular" if len(session_history) > 5 else "building",
                "total_sessions": len(session_history)
            })
        
        # Analyze observations for patterns
        entities = mcp_memory.get("patient_entities", [])
        for entity in entities:
            observations = entity.get("observations", [])
            sud_observations = [obs for obs in observations if "SUD" in obs]
            if len(sud_observations) >= 2:
                patterns.append({
                    "type": "sud_tracking",
                    "observations_count": len(sud_observations),
                    "pattern": "consistent_tracking"
                })
        
        return patterns
    
    def _extract_historical_patterns(self, patient_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract patterns from patient's historical data"""
        sessions = patient_context.get("sessions", [])
        patterns = []
        
        if len(sessions) >= 3:
            # SUD reduction pattern
            reductions = []
            for session in sessions:
                props = session.get("properties", {})
                if props.get("initial_sud") and props.get("final_sud"):
                    reductions.append(props["initial_sud"] - props["final_sud"])
            
            if reductions:
                patterns.append({
                    "type": "sud_reduction_trend",
                    "data": reductions,
                    "average": sum(reductions) / len(reductions),
                    "trend": "improving" if len(reductions) > 1 and reductions[-1] > reductions[0] else "stable"
                })
        
        # Session frequency pattern
        if sessions:
            session_dates = [datetime.fromisoformat(s["created_at"]) for s in sessions if "created_at" in s]
            if len(session_dates) >= 2:
                intervals = [(session_dates[i] - session_dates[i-1]).days for i in range(1, len(session_dates))]
                patterns.append({
                    "type": "session_frequency",
                    "average_interval_days": sum(intervals) / len(intervals) if intervals else 0,
                    "consistency": "regular" if all(abs(i - intervals[0]) <= 3 for i in intervals) else "irregular"
                })
        
        return patterns
    
    def _extract_successful_story_patterns(self, similar_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract successful story patterns from similar patients"""
        patterns = []
        
        for case in similar_cases[:2]:  # Top 2 similar cases
            case_context = case.get("context", {})
            successful_outcomes = [
                o for o in case_context.get("outcomes", [])
                if o.get("properties", {}).get("effectiveness_score", 0) > 0.7
            ]
            
            if successful_outcomes:
                patterns.append({
                    "patient_similarity": case.get("similarity_score", 0),
                    "successful_treatments": [o["properties"]["treatment_type"] for o in successful_outcomes],
                    "effectiveness_scores": [o["properties"]["effectiveness_score"] for o in successful_outcomes],
                    "patient_profile": case_context.get("patient", {}).get("properties", {})
                })
        
        return patterns
    
    def _generate_personalization_hints(self, mcp_context: MCPContext) -> List[str]:
        """Generate personalization hints for story generation"""
        hints = []
        
        patient_data = mcp_context.current_context.get("patient", {}).get("properties", {})
        progress_metrics = mcp_context.current_context.get("progress_metrics", {})
        
        # Age-based hints
        age = patient_data.get("age", 30)
        if age < 25:
            hints.append("Use contemporary references and technology")
        elif age > 50:
            hints.append("Use more traditional settings and references")
        
        # Progress-based hints
        if progress_metrics.get("trend") == "improving":
            hints.append("Patient is responding well - can handle moderate intensity")
        elif progress_metrics.get("average_reduction", 0) < 1:
            hints.append("Start with gentler exposure - patient may need more gradual approach")
        
        # Gender-based considerations
        if patient_data.get("gender") == "female":
            hints.append("Consider female protagonist or supportive female characters")
        elif patient_data.get("gender") == "male":
            hints.append("Consider male protagonist or relatable male experiences")
        
        return hints
    
    def _generate_safety_considerations(self, mcp_context: MCPContext) -> List[str]:
        """Generate safety considerations for therapy"""
        considerations = []
        
        patient_data = mcp_context.current_context.get("patient", {}).get("properties", {})
        
        # High severity indicators
        if patient_data.get("pcl5_score", 0) > 60:  # High PCL-5 score
            considerations.append("High PTSD severity - monitor for dissociation")
        
        if patient_data.get("phq9_score", 0) > 15:  # Moderate-severe depression
            considerations.append("Significant depression - watch for hopelessness themes")
        
        # Check for concerning triggers
        triggers = mcp_context.current_context.get("triggers", [])
        high_intensity_triggers = [
            t for t in triggers 
            if t.get("properties", {}).get("intensity") == "high"
        ]
        
        if len(high_intensity_triggers) > 2:
            considerations.append("Multiple high-intensity triggers - proceed gradually")
        
        return considerations
    
    def _get_age_group(self, age: Optional[int]) -> str:
        """Get age group classification"""
        if not age:
            return "adult"
        elif age < 25:
            return "young_adult"
        elif age < 45:
            return "adult"
        elif age < 65:
            return "middle_aged"
        else:
            return "older_adult"
    
    def _generate_research_keywords(self, symptoms: List[str], triggers: List[str]) -> List[str]:
        """Generate relevant research keywords based on patient profile"""
        keywords = ["PTSD", "trauma therapy"]
        
        # Add symptom-based keywords
        symptom_keywords = {
            "nightmares": ["sleep disturbance", "nightmare therapy"],
            "flashbacks": ["intrusive memories", "memory processing"],
            "avoidance": ["avoidance behavior", "behavioral activation"],
            "hypervigilance": ["hyperarousal", "anxiety management"],
            "depression": ["comorbid depression", "mood disorders"]
        }
        
        for symptom in symptoms:
            for key, kw_list in symptom_keywords.items():
                if key.lower() in symptom.lower():
                    keywords.extend(kw_list)
        
        # Add trigger-based keywords
        trigger_keywords = {
            "combat": ["military trauma", "veteran therapy"],
            "accident": ["accident trauma", "motor vehicle"],
            "assault": ["interpersonal trauma", "violence"],
            "medical": ["medical trauma", "hospital"]
        }
        
        for trigger in triggers:
            for key, kw_list in trigger_keywords.items():
                if key.lower() in trigger.lower():
                    keywords.extend(kw_list)
        
        return list(set(keywords))  # Remove duplicates

# Global MCP provider instance
mcp_provider = MCPMemoryProvider() 