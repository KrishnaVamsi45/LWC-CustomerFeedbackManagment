import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitFeedback from '@salesforce/apex/FeedbackController.submitFeedback';
import getFeedbacks from '@salesforce/apex/FeedbackController.getFeedbacks';
import updateFeedbackStatus from '@salesforce/apex/FeedbackController.updateFeedbackStatus';

export default class FeedbackManagement extends LightningElement {
    @track customerName = '';
    @track feedbackDescription = '';
    @track feedbackType = '';
    @track feedbacks = [];

    feedbackTypes = [
        { label: 'Complaint', value: 'Complaint' },
        { label: 'Suggestion', value: 'Suggestion' },
        { label: 'Compliment', value: 'Compliment' }
    ];

    statusOptions = [
        { label: 'New', value: 'New' },
        { label: 'Reviewed', value: 'Reviewed' },
        { label: 'Resolved', value: 'Resolved' }
    ];

    @wire(getFeedbacks)
    wiredFeedbacks({ error, data }) {
        if (data) {
            this.feedbacks = data.map(feedback => ({
                ...feedback,
                availableStatusOptions :[...this.statusOptions] 
            }));
        } else if (error) {
            console.error('Error fetching feedbacks:', error);
        }
    }

    handleInputChange(event) {
        const field = event.target.name;
        if (field === 'customerName') {
            this.customerName = event.target.value;
        } else if (field === 'feedbackDescription') {
            this.feedbackDescription = event.target.value;
        } else if (field === 'feedbackType') {
            this.feedbackType = event.target.value;
        }
    }

    handleSubmit() {
        submitFeedback({
            customerName: this.customerName,
            feedbackDescription: this.feedbackDescription,
            feedbackType: this.feedbackType
        })
        .then(() => {
            this.showToast('Success', 'Feedback submitted successfully!', 'success');
            return getFeedbacks();
        })
        .then(data => {
            this.feedbacks = data.map(feedback => ({
                ...feedback,
                availableStatusOptions: [...this.statusOptions]
            }));
            this.clearFields();
        })
        .catch(error => {
            this.showToast('Error', error.body.message, 'error');
            console.error('Error submitting feedback:', error);
        });
    }

    clearFields() {
        this.customerName = '';
        this.feedbackDescription = '';
        this.feedbackType = '';
    }

    handleStatusUpdate(event) {
        const feedbackId = event.target.dataset.id;
        const newStatus = event.target.value;

        updateFeedbackStatus({ feedbackId, status: newStatus })
            .then(() => {
                this.showToast('Success', 'Feedback status updated successfully!', 'success');
                this.updateFeedbackStatusOptions(feedbackId, newStatus); // Update options for the resolved feedback
            })
            .catch(error => {
                this.showToast('Error', 'Error updating feedback status: ' + error.body.message, 'error');
                console.error('Error updating feedback status:', error);
            });
    }

    updateFeedbackStatusOptions(feedbackId, newStatus) {
        this.feedbacks = this.feedbacks.map(feedback => {
            if (feedback.Id === feedbackId) {
                const updatedOptions = newStatus === 'Resolved'
                    ? this.statusOptions.filter(option => option.value !== 'Resolved')
                    : this.statusOptions;
                
                return { ...feedback, Status__c: newStatus, availableStatusOptions: updatedOptions };
            }
            return feedback;
        });
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
}