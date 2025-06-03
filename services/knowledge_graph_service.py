"""
Knowledge Graph Memory Service with MCP Integration
Provides persistent, interconnected memory for PTSD therapy sessions
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import networkx as nx
import pickle
import os

logger = logging.getLogger(__name__)

@dataclass
class GraphNode:
    """Represents a node in the knowledge graph"""
    id: str
    type: str  # patient, session, symptom, trigger, treatment, outcome
    properties: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

@dataclass
class GraphRelationship:
    """Represents a relationship between nodes"""
    source_id: str
    target_id: str
    relationship_type: str  # experiences, triggers, responds_to, improves_with
    properties: Dict[str, Any]
    strength: float  # 0.0 to 1.0
    created_at: datetime

class KnowledgeGraphMemory:
    """
    Knowledge Graph Memory System for PTSD Therapy
    Tracks patients, symptoms, treatments, and their relationships
    """
    
    def __init__(self, storage_path: str = "data/knowledge_graph.pkl"):
        self.storage_path = storage_path
        self.graph = nx.MultiDiGraph()
        self.nodes: Dict[str, GraphNode] = {}
        self.relationships: List[GraphRelationship] = []
        
        # Ensure storage directory exists
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)
        
        # Load existing graph
        self.load_graph()
        
    def add_patient_node(self, patient_id: str, patient_data: Dict[str, Any]) -> GraphNode:
        """Add or update a patient node in the knowledge graph"""
        node = GraphNode(
            id=f"patient_{patient_id}",
            type="patient",
            properties={
                "name": patient_data.get("name", ""),
                "age": patient_data.get("age"),
                "gender": patient_data.get("gender"),
                "trauma_type": patient_data.get("trauma_type"),
                "baseline_sud": patient_data.get("baseline_sud"),
                "pcl5_score": sum(patient_data.get("pcl5", [])),
                "phq9_score": sum(patient_data.get("phq9", []))
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.nodes[node.id] = node
        self.graph.add_node(node.id, **asdict(node))
        
        # Add symptom nodes and relationships
        self._add_patient_symptoms(patient_id, patient_data)
        self._add_patient_triggers(patient_id, patient_data)
        
        self.save_graph()
        return node
    
    def add_session_node(self, patient_id: str, session_data: Dict[str, Any]) -> GraphNode:
        """Add a therapy session node"""
        session_id = f"session_{patient_id}_{datetime.utcnow().isoformat()}"
        
        node = GraphNode(
            id=session_id,
            type="session",
            properties={
                "patient_id": patient_id,
                "session_type": session_data.get("type", "exposure"),
                "initial_sud": session_data.get("initial_sud"),
                "final_sud": session_data.get("final_sud"),
                "story_generated": session_data.get("story_id"),
                "duration_minutes": session_data.get("duration"),
                "therapist_notes": session_data.get("notes", "")
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.nodes[node.id] = node
        self.graph.add_node(node.id, **asdict(node))
        
        # Create relationship to patient
        self.add_relationship(
            f"patient_{patient_id}",
            session_id,
            "participated_in",
            {"session_outcome": "completed"}
        )
        
        self.save_graph()
        return node
    
    def add_treatment_outcome(self, patient_id: str, treatment_type: str, outcome_data: Dict[str, Any]):
        """Track treatment outcomes and effectiveness"""
        outcome_id = f"outcome_{patient_id}_{treatment_type}_{datetime.utcnow().isoformat()}"
        
        node = GraphNode(
            id=outcome_id,
            type="outcome",
            properties={
                "treatment_type": treatment_type,
                "effectiveness_score": outcome_data.get("effectiveness", 0.0),
                "sud_reduction": outcome_data.get("sud_reduction", 0),
                "symptom_improvement": outcome_data.get("symptom_improvement", {}),
                "side_effects": outcome_data.get("side_effects", []),
                "patient_feedback": outcome_data.get("feedback", "")
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.nodes[node.id] = node
        self.graph.add_node(node.id, **asdict(node))
        
        # Link to patient and treatment
        self.add_relationship(
            f"patient_{patient_id}",
            outcome_id,
            "achieved_outcome",
            {"effectiveness": outcome_data.get("effectiveness", 0.0)}
        )
        
        self.save_graph()
    
    def add_relationship(self, source_id: str, target_id: str, rel_type: str, 
                        properties: Dict[str, Any] = None, strength: float = 1.0):
        """Add a relationship between two nodes"""
        relationship = GraphRelationship(
            source_id=source_id,
            target_id=target_id,
            relationship_type=rel_type,
            properties=properties or {},
            strength=strength,
            created_at=datetime.utcnow()
        )
        
        self.relationships.append(relationship)
        self.graph.add_edge(source_id, target_id, 
                           relationship=rel_type, 
                           strength=strength,
                           **properties or {})
    
    def get_patient_context(self, patient_id: str) -> Dict[str, Any]:
        """Get comprehensive context for a patient from the knowledge graph"""
        patient_node_id = f"patient_{patient_id}"
        
        if patient_node_id not in self.nodes:
            return {}
        
        # Get patient node
        patient_node = self.nodes[patient_node_id]
        
        # Get connected nodes
        connected_nodes = list(self.graph.neighbors(patient_node_id))
        
        # Get session history
        sessions = [
            self.nodes[node_id] for node_id in connected_nodes 
            if self.nodes[node_id].type == "session"
        ]
        sessions.sort(key=lambda x: x.created_at)
        
        # Get symptoms and triggers
        symptoms = [
            self.nodes[node_id] for node_id in connected_nodes 
            if self.nodes[node_id].type == "symptom"
        ]
        
        triggers = [
            self.nodes[node_id] for node_id in connected_nodes 
            if self.nodes[node_id].type == "trigger"
        ]
        
        # Get treatment outcomes
        outcomes = [
            self.nodes[node_id] for node_id in connected_nodes 
            if self.nodes[node_id].type == "outcome"
        ]
        
        # Calculate progress metrics
        progress_metrics = self._calculate_progress_metrics(patient_id, sessions)
        
        return {
            "patient": asdict(patient_node),
            "sessions": [asdict(s) for s in sessions],
            "symptoms": [asdict(s) for s in symptoms],
            "triggers": [asdict(t) for t in triggers],
            "outcomes": [asdict(o) for o in outcomes],
            "progress_metrics": progress_metrics,
            "total_sessions": len(sessions),
            "last_session": sessions[-1].created_at.isoformat() if sessions else None
        }
    
    def find_similar_patients(self, patient_id: str, similarity_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find patients with similar symptoms, triggers, or treatment responses"""
        target_patient = self.get_patient_context(patient_id)
        similar_patients = []
        
        for node_id, node in self.nodes.items():
            if node.type == "patient" and node.id != f"patient_{patient_id}":
                other_patient_id = node.id.replace("patient_", "")
                other_context = self.get_patient_context(other_patient_id)
                
                similarity = self._calculate_patient_similarity(target_patient, other_context)
                
                if similarity >= similarity_threshold:
                    similar_patients.append({
                        "patient_id": other_patient_id,
                        "similarity_score": similarity,
                        "context": other_context
                    })
        
        return sorted(similar_patients, key=lambda x: x["similarity_score"], reverse=True)
    
    def get_treatment_recommendations(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get treatment recommendations based on similar patients and outcomes"""
        similar_patients = self.find_similar_patients(patient_id)
        recommendations = []
        
        for similar_patient in similar_patients[:3]:  # Top 3 similar patients
            for outcome in similar_patient["context"]["outcomes"]:
                if outcome["properties"]["effectiveness_score"] > 0.7:
                    recommendations.append({
                        "treatment_type": outcome["properties"]["treatment_type"],
                        "effectiveness_score": outcome["properties"]["effectiveness_score"],
                        "based_on_patient": similar_patient["patient_id"],
                        "similarity_score": similar_patient["similarity_score"],
                        "evidence": outcome["properties"]
                    })
        
        # Remove duplicates and sort by effectiveness
        unique_recommendations = {}
        for rec in recommendations:
            treatment = rec["treatment_type"]
            if treatment not in unique_recommendations or rec["effectiveness_score"] > unique_recommendations[treatment]["effectiveness_score"]:
                unique_recommendations[treatment] = rec
        
        return sorted(unique_recommendations.values(), key=lambda x: x["effectiveness_score"], reverse=True)
    
    def _add_patient_symptoms(self, patient_id: str, patient_data: Dict[str, Any]):
        """Add symptom nodes for a patient"""
        symptoms = patient_data.get("ptsd_symptoms", [])
        
        for symptom in symptoms:
            symptom_id = f"symptom_{symptom.lower().replace(' ', '_')}"
            
            if symptom_id not in self.nodes:
                symptom_node = GraphNode(
                    id=symptom_id,
                    type="symptom",
                    properties={"name": symptom, "category": "ptsd"},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.nodes[symptom_id] = symptom_node
                self.graph.add_node(symptom_id, **asdict(symptom_node))
            
            # Create relationship
            self.add_relationship(
                f"patient_{patient_id}",
                symptom_id,
                "experiences",
                {"severity": "moderate"}  # Could be enhanced with actual severity data
            )
    
    def _add_patient_triggers(self, patient_id: str, patient_data: Dict[str, Any]):
        """Add trigger nodes for a patient"""
        triggers = patient_data.get("triggers", [])
        
        for trigger_data in triggers:
            trigger_name = trigger_data.get("name", "") if isinstance(trigger_data, dict) else str(trigger_data)
            trigger_sud = trigger_data.get("sud", 5) if isinstance(trigger_data, dict) else 5
            
            trigger_id = f"trigger_{trigger_name.lower().replace(' ', '_')}"
            
            if trigger_id not in self.nodes:
                trigger_node = GraphNode(
                    id=trigger_id,
                    type="trigger",
                    properties={"name": trigger_name, "category": "environmental"},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.nodes[trigger_id] = trigger_node
                self.graph.add_node(trigger_id, **asdict(trigger_node))
            
            # Create relationship with SUD intensity
            self.add_relationship(
                f"patient_{patient_id}",
                trigger_id,
                "triggered_by",
                {"sud_level": trigger_sud, "intensity": "high" if trigger_sud > 7 else "moderate" if trigger_sud > 4 else "low"}
            )
    
    def _calculate_progress_metrics(self, patient_id: str, sessions: List[GraphNode]) -> Dict[str, Any]:
        """Calculate progress metrics from session data"""
        if not sessions:
            return {}
        
        initial_suds = [s.properties.get("initial_sud") for s in sessions if s.properties.get("initial_sud")]
        final_suds = [s.properties.get("final_sud") for s in sessions if s.properties.get("final_sud")]
        
        if not initial_suds or not final_suds:
            return {}
        
        avg_initial_sud = sum(initial_suds) / len(initial_suds)
        avg_final_sud = sum(final_suds) / len(final_suds)
        avg_reduction = avg_initial_sud - avg_final_sud
        
        # Calculate trend
        recent_sessions = sessions[-5:] if len(sessions) >= 5 else sessions
        recent_reductions = [
            s.properties.get("initial_sud", 0) - s.properties.get("final_sud", 0)
            for s in recent_sessions
            if s.properties.get("initial_sud") and s.properties.get("final_sud")
        ]
        
        trend = "improving" if len(recent_reductions) > 1 and recent_reductions[-1] > recent_reductions[0] else "stable"
        
        return {
            "average_initial_sud": avg_initial_sud,
            "average_final_sud": avg_final_sud,
            "average_reduction": avg_reduction,
            "total_sessions": len(sessions),
            "trend": trend,
            "last_session_reduction": recent_reductions[-1] if recent_reductions else 0
        }
    
    def _calculate_patient_similarity(self, patient1: Dict[str, Any], patient2: Dict[str, Any]) -> float:
        """Calculate similarity between two patients based on symptoms, triggers, and demographics"""
        similarity_score = 0.0
        total_factors = 0
        
        # Compare symptoms
        p1_symptoms = set(s["properties"]["name"] for s in patient1.get("symptoms", []))
        p2_symptoms = set(s["properties"]["name"] for s in patient2.get("symptoms", []))
        
        if p1_symptoms or p2_symptoms:
            symptom_similarity = len(p1_symptoms.intersection(p2_symptoms)) / len(p1_symptoms.union(p2_symptoms))
            similarity_score += symptom_similarity * 0.4
            total_factors += 0.4
        
        # Compare triggers
        p1_triggers = set(t["properties"]["name"] for t in patient1.get("triggers", []))
        p2_triggers = set(t["properties"]["name"] for t in patient2.get("triggers", []))
        
        if p1_triggers or p2_triggers:
            trigger_similarity = len(p1_triggers.intersection(p2_triggers)) / len(p1_triggers.union(p2_triggers))
            similarity_score += trigger_similarity * 0.3
            total_factors += 0.3
        
        # Compare demographics
        p1_props = patient1.get("patient", {}).get("properties", {})
        p2_props = patient2.get("patient", {}).get("properties", {})
        
        demo_similarity = 0.0
        demo_factors = 0
        
        if p1_props.get("gender") == p2_props.get("gender"):
            demo_similarity += 0.5
        demo_factors += 0.5
        
        # Age similarity (within 10 years = full similarity)
        age_diff = abs((p1_props.get("age", 0) or 0) - (p2_props.get("age", 0) or 0))
        age_similarity = max(0, 1 - age_diff / 20)  # 20 year difference = 0 similarity
        demo_similarity += age_similarity * 0.5
        demo_factors += 0.5
        
        if demo_factors > 0:
            similarity_score += (demo_similarity / demo_factors) * 0.3
            total_factors += 0.3
        
        return similarity_score / total_factors if total_factors > 0 else 0.0
    
    def save_graph(self):
        """Save the knowledge graph to disk"""
        try:
            graph_data = {
                "nodes": {k: asdict(v) for k, v in self.nodes.items()},
                "relationships": [asdict(r) for r in self.relationships],
                "graph": nx.node_link_data(self.graph)
            }
            
            with open(self.storage_path, 'wb') as f:
                pickle.dump(graph_data, f)
                
            logger.info(f"Knowledge graph saved with {len(self.nodes)} nodes and {len(self.relationships)} relationships")
            
        except Exception as e:
            logger.error(f"Failed to save knowledge graph: {e}")
    
    def load_graph(self):
        """Load the knowledge graph from disk"""
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'rb') as f:
                    graph_data = pickle.load(f)
                
                # Reconstruct nodes
                for node_id, node_data in graph_data.get("nodes", {}).items():
                    # Convert datetime strings back to datetime objects
                    node_data["created_at"] = datetime.fromisoformat(node_data["created_at"]) if isinstance(node_data["created_at"], str) else node_data["created_at"]
                    node_data["updated_at"] = datetime.fromisoformat(node_data["updated_at"]) if isinstance(node_data["updated_at"], str) else node_data["updated_at"]
                    self.nodes[node_id] = GraphNode(**node_data)
                
                # Reconstruct relationships
                for rel_data in graph_data.get("relationships", []):
                    rel_data["created_at"] = datetime.fromisoformat(rel_data["created_at"]) if isinstance(rel_data["created_at"], str) else rel_data["created_at"]
                    self.relationships.append(GraphRelationship(**rel_data))
                
                # Reconstruct NetworkX graph
                if "graph" in graph_data:
                    self.graph = nx.node_link_graph(graph_data["graph"])
                
                logger.info(f"Knowledge graph loaded with {len(self.nodes)} nodes and {len(self.relationships)} relationships")
            else:
                logger.info("No existing knowledge graph found, starting fresh")
                
        except Exception as e:
            logger.error(f"Failed to load knowledge graph: {e}")
            # Start with empty graph on error
            self.graph = nx.MultiDiGraph()
            self.nodes = {}
            self.relationships = []

# Global instance
knowledge_graph = KnowledgeGraphMemory() 