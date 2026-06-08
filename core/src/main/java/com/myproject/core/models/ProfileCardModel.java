package com.myproject.core.models;

import com.myproject.core.services.ProfileFallbackService;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.OSGiService;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

import javax.annotation.PostConstruct;

@Model(
    adaptables = SlingHttpServletRequest.class,
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL
)
public class ProfileCardModel {

    @ValueMapValue
    private String firstName;

    @ValueMapValue
    private String lastName;

    @ValueMapValue
    private String skills;

    @ValueMapValue
    private String profileImage;

    @OSGiService
    private ProfileFallbackService profileFallbackService;

    private String fullName;
    private String finalImagePath;
    private String[] skillsArray;

    @PostConstruct
    protected void init() {
        // Name combination logic
        String fName = (firstName != null) ? firstName.trim() : "";
        String lName = (lastName != null) ? lastName.trim() : "";
        fullName = (fName + " " + lName).trim();

        // Image Fallback logic via OSGi Service
        finalImagePath = profileFallbackService.getFinalImagePath(profileImage);

        // String to Array manipulation logic
        if (skills != null && !skills.trim().isEmpty()) {
            skillsArray = skills.split(",");
            // Trim extra spaces from each element
            for (int i = 0; i < skillsArray.length; i++) {
                skillsArray[i] = skillsArray[i].trim();
            }
        } else {
            skillsArray = new String[0]; // Empty array to avoid NullPointerException in HTL
        }
    }

    public String getFullName() {
        return fullName;
    }

    public String getFinalImagePath() {
        return finalImagePath;
    }

    public String[] getSkillsArray() {
        return skillsArray;
    }
}