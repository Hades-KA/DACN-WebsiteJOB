const axios = require('axios');

class AIService {
  constructor() {
    // Cấu hình API từ project AI đồ án cơ sở
    this.apiUrl = process.env.AI_API_URL || 'http://localhost:8000';
    this.apiKey = process.env.AI_API_KEY;
  }

  // Extract information from CV PDF
  async extractCVInfo(filePath) {
    try {
      const response = await axios.post(`${this.apiUrl}/extract-cv`, {
        filePath,
        apiKey: this.apiKey
      }, {
        timeout: 60000 // 60 seconds for PDF processing
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI CV Extraction Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackExtraction()
      };
    }
  }

  // Classify CV by IT field using zero-shot
  async classifyCV(cvData) {
    try {
      const response = await axios.post(`${this.apiUrl}/classify-cv`, {
        cvData,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI CV Classification Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackClassification(cvData)
      };
    }
  }

  // Compare skills with template CV
  async compareSkills(cvData, templateCV) {
    try {
      const response = await axios.post(`${this.apiUrl}/compare-skills`, {
        cvData,
        templateCV,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Skills Comparison Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackComparison(cvData, templateCV)
      };
    }
  }

  // Auto filter CVs based on match percentage
  async filterCVs(cvs, threshold = 50) {
    try {
      const response = await axios.post(`${this.apiUrl}/filter-cvs`, {
        cvs,
        threshold,
        apiKey: this.apiKey
      }, {
        timeout: 60000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI CV Filtering Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackFiltering(cvs, threshold)
      };
    }
  }

  // Generate comparison report
  async generateComparisonReport(cvs) {
    try {
      const response = await axios.post(`${this.apiUrl}/comparison-report`, {
        cvs,
        apiKey: this.apiKey
      }, {
        timeout: 60000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Report Generation Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackReport(cvs)
      };
    }
  }

  // Analyze CV with AI (enhanced version)
  async analyzeCV(cvData) {
    try {
      const response = await axios.post(`${this.apiUrl}/analyze-cv`, {
        cvData,
        apiKey: this.apiKey
      }, {
        timeout: 30000 // 30 seconds timeout
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI CV Analysis Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackAnalysis(cvData)
      };
    }
  }

  // Predict job performance
  async predictPerformance(candidateId, jobId, cvData, jobData) {
    try {
      const response = await axios.post(`${this.apiUrl}/predict-performance`, {
        candidateId,
        jobId,
        cvData,
        jobData,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Performance Prediction Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackPrediction(cvData, jobData)
      };
    }
  }

  // Get job recommendations for candidate
  async getJobRecommendations(candidateId, cvData) {
    try {
      const response = await axios.post(`${this.apiUrl}/job-recommendations`, {
        candidateId,
        cvData,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Job Recommendations Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackRecommendations()
      };
    }
  }

  // Get candidate recommendations for job
  async getCandidateRecommendations(jobId, jobData) {
    try {
      const response = await axios.post(`${this.apiUrl}/candidate-recommendations`, {
        jobId,
        jobData,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Candidate Recommendations Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackCandidateRecommendations()
      };
    }
  }

  // Analyze job match
  async analyzeJobMatch(cvId, jobId, cvData, jobData) {
    try {
      const response = await axios.post(`${this.apiUrl}/analyze-job-match`, {
        cvId,
        jobId,
        cvData,
        jobData,
        apiKey: this.apiKey
      }, {
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('AI Job Match Analysis Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackJobMatch(cvData, jobData)
      };
    }
  }

  // Generate fallback analysis when AI service is unavailable
  generateFallbackAnalysis(cvData) {
    const skills = cvData.skills || [];
    const experience = cvData.experience || 0;
    
    // Simple scoring algorithm
    let score = 5; // Base score
    
    // Experience bonus
    if (experience >= 5) score += 2;
    else if (experience >= 3) score += 1.5;
    else if (experience >= 1) score += 1;
    
    // Skills bonus
    if (skills.length >= 10) score += 1.5;
    else if (skills.length >= 5) score += 1;
    else if (skills.length >= 3) score += 0.5;
    
    // Random factor for realism
    score += (Math.random() - 0.5) * 2;
    score = Math.max(0, Math.min(10, score));

    return {
      score: parseFloat(score.toFixed(1)),
      strengths: [
        'Good technical background',
        'Relevant work experience',
        'Strong communication skills'
      ],
      improvements: [
        'Consider adding more project details',
        'Highlight leadership experience',
        'Include specific achievements'
      ],
      skillsMatch: Math.floor(Math.random() * 20) + 70, // 70-90%
      experienceMatch: Math.floor(Math.random() * 15) + 75, // 75-90%
      educationMatch: Math.floor(Math.random() * 10) + 85 // 85-95%
    };
  }

  // Generate fallback prediction
  generateFallbackPrediction(cvData, jobData) {
    const experience = cvData.experience || 0;
    const requiredExperience = this.extractExperienceFromJob(jobData.requirements || '');
    
    let efficiency = 60; // Base efficiency
    
    if (experience >= requiredExperience) {
      efficiency += 20;
    } else if (experience >= requiredExperience * 0.7) {
      efficiency += 10;
    }
    
    // Add some randomness
    efficiency += (Math.random() - 0.5) * 20;
    efficiency = Math.max(30, Math.min(95, efficiency));

    return {
      efficiency: Math.floor(efficiency),
      confidence: Math.floor(Math.random() * 20) + 70, // 70-90%
      factors: [
        'Experience match',
        'Skills alignment',
        'Education relevance'
      ],
      recommendations: [
        'Consider additional training',
        'Focus on soft skills development'
      ]
    };
  }

  // Generate fallback recommendations
  generateFallbackRecommendations() {
    return {
      jobs: [
        {
          id: 'rec-1',
          title: 'Senior Developer',
          company: 'Tech Corp',
          matchScore: 85
        },
        {
          id: 'rec-2',
          title: 'Full Stack Engineer',
          company: 'StartupXYZ',
          matchScore: 78
        }
      ],
      reasons: [
        'Skills alignment',
        'Experience match',
        'Location preference'
      ]
    };
  }

  // Generate fallback candidate recommendations
  generateFallbackCandidateRecommendations() {
    return {
      candidates: [
        {
          id: 'cand-1',
          name: 'John Doe',
          matchScore: 88
        },
        {
          id: 'cand-2',
          name: 'Jane Smith',
          matchScore: 82
        }
      ],
      reasons: [
        'Technical skills match',
        'Experience level appropriate',
        'Cultural fit'
      ]
    };
  }

  // Generate fallback job match
  generateFallbackJobMatch(cvData, jobData) {
    const skills = cvData.skills || [];
    const jobSkills = this.extractSkillsFromJob(jobData.requirements || '');
    
    const commonSkills = skills.filter(skill => 
      jobSkills.some(jobSkill => 
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    const matchPercentage = jobSkills.length > 0 
      ? (commonSkills.length / jobSkills.length) * 100 
      : 50;
    
    return {
      matchScore: Math.floor(matchPercentage),
      matchedSkills: commonSkills,
      missingSkills: jobSkills.filter(skill => 
        !skills.some(cvSkill => 
          cvSkill.toLowerCase().includes(skill.toLowerCase())
        )
      ),
      recommendations: [
        'Consider additional training in missing skills',
        'Highlight relevant experience',
        'Emphasize transferable skills'
      ]
    };
  }

  // Helper method to extract experience from job requirements
  extractExperienceFromJob(requirements) {
    const expMatch = requirements.match(/(\d+)[\s-]*year/i);
    return expMatch ? parseInt(expMatch[1]) : 2;
  }

  // Helper method to extract skills from job requirements
  extractSkillsFromJob(requirements) {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
      'HTML', 'CSS', 'Git', 'Docker', 'AWS', 'MongoDB'
    ];
    
    return commonSkills.filter(skill => 
      requirements.toLowerCase().includes(skill.toLowerCase())
    );
  }
}

module.exports = new AIService();
