from exa_py import Exa
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EXA_API_KEY = os.environ.get('EXA_API_KEY', '3e60a930-f0ee-4425-9814-4dc92c8f909f')
exa = Exa(api_key=EXA_API_KEY)

def _filter_and_score_results(results, search_type="general"):
    """
    Filter and score results based on quality indicators and search type
    """
    filtered_results = []
    
    for result in results:
        # Convert Exa result object to dictionary to allow custom fields
        result_dict = {
            'title': getattr(result, 'title', ''),
            'url': getattr(result, 'url', ''),
            'text': getattr(result, 'text', ''),
            'author': getattr(result, 'author', ''),
            'published_date': getattr(result, 'published_date', ''),
            'favicon': getattr(result, 'favicon', ''),
            'image': getattr(result, 'image', ''),
            'score': getattr(result, 'score', 0),
            'id': getattr(result, 'id', ''),
        }
        
        # Quality scoring based on various factors
        score = 0
        url = result_dict['url'].lower()
        title = (result_dict['title'] or "").lower()
        text = (result_dict['text'] or "").lower()
        
        # Authority domains get higher scores
        authority_domains = [
            'apa.org', 'ptsd.va.gov', 'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov',
            'who.int', 'cdc.gov', 'nimh.nih.gov', 'samhsa.gov', 'istss.org'
        ]
        
        if any(domain in url for domain in authority_domains):
            score += 10
            
        # Academic/research indicators
        academic_indicators = ['doi.org', 'journal', 'research', 'study', 'clinical trial']
        if any(indicator in url or indicator in title for indicator in academic_indicators):
            score += 5
            
        # Content quality indicators
        quality_indicators = ['evidence-based', 'peer-reviewed', 'clinical', 'guidelines']
        if any(indicator in text for indicator in quality_indicators):
            score += 3
            
        # Length indicates comprehensive content
        if len(text) > 500:
            score += 2
            
        # Search-type-specific scoring
        if search_type == "ptsd_research":
            # Prioritize research papers and clinical studies
            research_terms = ['randomized controlled trial', 'meta-analysis', 'systematic review', 'clinical trial']
            if any(term in text for term in research_terms):
                score += 5
            if 'ptsd' in title or 'post-traumatic stress' in title:
                score += 3
                
        elif search_type == "cbt_techniques":
            # Prioritize practical CBT resources
            cbt_terms = ['cognitive behavioral', 'cbt', 'therapy technique', 'intervention']
            if any(term in text for term in cbt_terms):
                score += 4
            if 'manual' in title or 'protocol' in title:
                score += 3
                
        elif search_type == "exposure_therapy":
            # Prioritize exposure therapy specific content
            exposure_terms = ['prolonged exposure', 'imaginal exposure', 'in vivo', 'exposure protocol']
            if any(term in text for term in exposure_terms):
                score += 4
                
        elif search_type == "therapist_resources":
            # Prioritize professional resources
            professional_terms = ['therapist', 'clinician', 'professional', 'training', 'certification']
            if any(term in text for term in professional_terms):
                score += 3
            if 'continuing education' in text or 'professional development' in text:
                score += 2
                
        elif search_type == "coping_strategies":
            # Prioritize patient-facing resources
            patient_terms = ['self-help', 'coping', 'patient', 'survivor', 'recovery']
            if any(term in text for term in patient_terms):
                score += 3
            # Slightly lower standards for patient resources
            if score == 0 and len(text) > 300:
                score += 1
        
        # Filter out low-quality results
        low_quality_indicators = ['blog', 'forum', 'reddit', 'quora', 'yahoo answers']
        if any(indicator in url for indicator in low_quality_indicators):
            score -= 5
            
        # Search-type-specific exclusions
        if search_type in ["ptsd_research", "cbt_techniques", "exposure_therapy"]:
            # Stricter filtering for clinical/research content
            if score < 3:  # Higher threshold for clinical content
                continue
        else:
            # More lenient for general resources
            if score <= 0:
                continue
                
        # Add quality score to the result dictionary
        result_dict['quality_score'] = score
        filtered_results.append(result_dict)
    
    # Sort by quality score (highest first)
    filtered_results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
    
    return filtered_results

def _safe_search(query, max_characters=1000, num_results=5, search_type="general"):
    """
    Safe wrapper for Exa searches with error handling and logging
    """
    try:
        logger.info(f"Exa search [{search_type}]: {query[:100]}...")
        result = exa.search_and_contents(
            query,
            text={"max_characters": max_characters},
            num_results=num_results
        )
        
        # Filter and score results (returns list of dictionaries)
        filtered_results = _filter_and_score_results(result.results, search_type)
        
        # Create a new result object with filtered results
        class FilteredResult:
            def __init__(self, results):
                self.results = results
        
        filtered_result = FilteredResult(filtered_results)
        
        logger.info(f"Exa search successful: {len(filtered_results)} quality results")
        return filtered_result
    except Exception as e:
        logger.error(f"Exa search failed [{search_type}]: {str(e)}")
        # Return empty result structure to prevent crashes
        class EmptyResult:
            def __init__(self):
                self.results = []
        return EmptyResult()

def search_ptsd_research(query, max_characters=1500):
    """Search for PTSD research papers and clinical studies"""
    full_query = f"PTSD research clinical study {query}"
    return _safe_search(full_query, max_characters, 5, "ptsd_research")

def search_cbt_techniques(technique_name, max_characters=1000):
    """Search for CBT techniques and therapeutic interventions"""
    query = f"CBT cognitive behavioral therapy technique {technique_name} PTSD trauma"
    return _safe_search(query, max_characters, 3, "cbt_techniques")

def search_exposure_therapy_methods(max_characters=1200):
    """Search for exposure therapy methods and best practices"""
    query = "exposure therapy PTSD treatment methods prolonged exposure imaginal"
    return _safe_search(query, max_characters, 4, "exposure_therapy")

def search_sud_scale_research(max_characters=800):
    """Search for SUD (Subjective Units of Distress) scale research and usage"""
    query = "SUD scale subjective units distress PTSD therapy measurement"
    return _safe_search(query, max_characters, 3, "sud_scale")

def search_narrative_therapy_ptsd(max_characters=1000):
    """Search for narrative therapy approaches for PTSD"""
    query = "narrative therapy PTSD storytelling therapeutic intervention trauma"
    return _safe_search(query, max_characters, 4, "narrative_therapy")

def search_therapist_resources(topic, max_characters=1200):
    """Search for therapist resources on specific PTSD topics"""
    query = f"therapist resources PTSD treatment {topic} clinical guidelines"
    return _safe_search(query, max_characters, 5, "therapist_resources")

def search_patient_coping_strategies(max_characters=800):
    """Search for patient coping strategies and self-help techniques"""
    query = "PTSD coping strategies self-help techniques grounding mindfulness"
    return _safe_search(query, max_characters, 4, "coping_strategies")

def search_trauma_triggers_management(max_characters=1000):
    """Search for trauma trigger identification and management"""
    query = "trauma triggers identification management PTSD avoidance behavior"
    return _safe_search(query, max_characters, 4, "trigger_management") 