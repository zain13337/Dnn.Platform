import React, { Component, PropTypes } from "react";
import { connect } from "react-redux";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import {
    pagination as PaginationActions,
    seo as SeoActions
} from "../../actions";
import InputGroup from "dnn-input-group";
import SingleLineInputWithError from "dnn-single-line-input-with-error";
import MultiLineInput from "dnn-multi-line-input";
import Tooltip from "dnn-tooltip";
import Grid from "dnn-grid-system";
import Dropdown from "dnn-dropdown";
import Label from "dnn-label";
import RadioButtons from "dnn-radio-buttons";
import Switch from "dnn-switch";
import Button from "dnn-button";
import "./style.less";
import util from "../../utils";
import resx from "../../resources";
import styles from "./style.less";

class RegexSettingsPanelBody extends Component {
    constructor() {
        super();
        this.state = {
            regexSettings: undefined,
            triedToSubmit: false,
            error: {
                IgnoreRegex: false,
                DoNotRewriteRegex: false,
                UseSiteUrlsRegex: false,
                DoNotRedirectRegex: false,
                DoNotRedirectSecureRegex: false,
                ForceLowerCaseRegex: false,
                NoFriendlyUrlRegex: false,
                DoNotIncludeInPathRegex: false,
                ValidExtensionlessUrlsRegex: false,
                RegexMatch: false
            }
        };
    }

    componentWillMount() {
        const {state, props} = this;
        if (props.regexSettings) {
            this.setState({
                regexSettings: props.regexSettings
            });
            return;
        }
        props.dispatch(SeoActions.getRegexSettings((data) => {
            this.setState({
                regexSettings: Object.assign({}, data.Settings)
            });
        }));
    }

    componentWillReceiveProps(props) {
        let {state} = this;

        this.setState({
            regexSettings: Object.assign({}, props.regexSettings),
            triedToSubmit: false
        });
    }

    onSettingChange(key, event) {
        let {state, props} = this;
        let regexSettings = Object.assign({}, state.regexSettings);

        regexSettings[key] = typeof (event) === "object" ? event.target.value : event;

        this.setState({
            regexSettings: regexSettings,
            triedToSubmit: false
        });

        props.dispatch(SeoActions.regexSettingsClientModified(regexSettings));
    }

    onUpdate(event) {
        event.preventDefault();
        const {props, state} = this;
        this.setState({
            triedToSubmit: true,
            error: {
                IgnoreRegex: false,
                DoNotRewriteRegex: false,
                UseSiteUrlsRegex: false,
                DoNotRedirectRegex: false,
                DoNotRedirectSecureRegex: false,
                ForceLowerCaseRegex: false,
                NoFriendlyUrlRegex: false,
                DoNotIncludeInPathRegex: false,
                ValidExtensionlessUrlsRegex: false,
                RegexMatch: false
            }
        });

        props.dispatch(SeoActions.updateRegexSettings(state.regexSettings, (data) => {
            util.utilities.notify(resx.get("SettingsUpdateSuccess"));
        }, (error) => {
            const errorMessage = JSON.parse(error.responseText);
            if (errorMessage.Errors) {
                this.handleValidationErrors(errorMessage.Errors);
            }
            else {
                util.utilities.notifyError(resx.get("SettingsError"));
            }
        }));
    }

    handleValidationErrors(errors) {
        let {state} = this;       

        if(errors.filter(error => { return error.Key === "IgnoreRegex"; }).length > 0){
            state.error["IgnoreRegex"] = true;
        }
        else{
            state.error["IgnoreRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "DoNotRewriteRegex"; }).length > 0){
            state.error["DoNotRewriteRegex"] = true;
        }
        else{
            state.error["DoNotRewriteRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "UseSiteUrlsRegex"; }).length > 0){
            state.error["UseSiteUrlsRegex"] = true;
        }
        else{
            state.error["UseSiteUrlsRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "DoNotRedirectRegex"; }).length > 0){
            state.error["DoNotRedirectRegex"] = true;
        }
        else{
            state.error["DoNotRedirectRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "DoNotRedirectSecureRegex"; }).length > 0){
            state.error["DoNotRedirectSecureRegex"] = true;
        }
        else{
            state.error["DoNotRedirectSecureRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "ForceLowerCaseRegex"; }).length > 0){
            state.error["ForceLowerCaseRegex"] = true;
        }
        else{
            state.error["ForceLowerCaseRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "NoFriendlyUrlRegex"; }).length > 0){
            state.error["NoFriendlyUrlRegex"] = true;
        }
        else{
            state.error["NoFriendlyUrlRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "DoNotIncludeInPathRegex"; }).length > 0){
            state.error["DoNotIncludeInPathRegex"] = true;
        }
        else{
            state.error["DoNotIncludeInPathRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "ValidExtensionlessUrlsRegex"; }).length > 0){
            state.error["ValidExtensionlessUrlsRegex"] = true;
        }
        else{
            state.error["ValidExtensionlessUrlsRegex"] = false;
        }
        if(errors.filter(error => { return error.Key === "RegexMatch"; }).length > 0){
            state.error["RegexMatch"] = true;
        }
        else{
            state.error["RegexMatch"] = false;
        }

        this.setState({
            error: state.error
        });
    }

    onCancel(event) {
        const {props, state} = this;
        util.utilities.confirm(resx.get("SettingsRestoreWarning"), resx.get("Yes"), resx.get("No"), () => {
            props.dispatch(SeoActions.getRegexSettings((data) => {
                this.setState({
                    regexSettings: Object.assign({}, data.Settings)
                });
            }));
        });
    }

    /* eslint-disable react/no-danger */
    render() {
        const {props, state} = this;
        if (state.regexSettings) {
            return (
                <div className={styles.regexSettings}>
                    <div className="columnTitle">{resx.get("RegularExpressions")}</div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("ignoreRegExLabel.Help")}
                                label={resx.get("ignoreRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.IgnoreRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("ignoreRegExInvalidPattern")}
                                value={state.regexSettings.IgnoreRegex}
                                onChange={this.onSettingChange.bind(this, "IgnoreRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("doNotRewriteRegExLabel.Help")}
                                label={resx.get("doNotRewriteRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.DoNotRewriteRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("doNotRewriteRegExInvalidPattern")}
                                value={state.regexSettings.DoNotRewriteRegex}
                                onChange={this.onSettingChange.bind(this, "DoNotRewriteRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("siteUrlsOnlyRegExLabel.Help")}
                                label={resx.get("siteUrlsOnlyRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.UseSiteUrlsRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("siteUrlsOnlyRegExInvalidPattern")}
                                value={state.regexSettings.UseSiteUrlsRegex}
                                onChange={this.onSettingChange.bind(this, "UseSiteUrlsRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("doNotRedirectUrlRegExLabel.Help")}
                                label={resx.get("doNotRedirectUrlRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.DoNotRedirectRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("doNotRedirectUrlRegExInvalidPattern")}
                                value={state.regexSettings.DoNotRedirectRegex}
                                onChange={this.onSettingChange.bind(this, "DoNotRedirectRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("doNotRedirectHttpsUrlRegExLabel.Help")}
                                label={resx.get("doNotRedirectHttpsUrlRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.DoNotRedirectSecureRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("doNotRedirectHttpsUrlRegExInvalidPattern")}
                                value={state.regexSettings.DoNotRedirectSecureRegex}
                                onChange={this.onSettingChange.bind(this, "DoNotRedirectSecureRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("preventLowerCaseUrlRegExLabel.Help")}
                                label={resx.get("preventLowerCaseUrlRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.ForceLowerCaseRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("preventLowerCaseUrlRegExInvalidPattern")}
                                value={state.regexSettings.ForceLowerCaseRegex}
                                onChange={this.onSettingChange.bind(this, "ForceLowerCaseRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("doNotUseFriendlyUrlsRegExLabel.Help")}
                                label={resx.get("doNotUseFriendlyUrlsRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.NoFriendlyUrlRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("doNotUseFriendlyUrlsRegExInvalidPattern")}
                                value={state.regexSettings.NoFriendlyUrlRegex}
                                onChange={this.onSettingChange.bind(this, "NoFriendlyUrlRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("keepInQueryStringRegExLabel.Help")}
                                label={resx.get("keepInQueryStringRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.DoNotIncludeInPathRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("keepInQueryStringRegExInvalidPattern")}
                                value={state.regexSettings.DoNotIncludeInPathRegex}
                                onChange={this.onSettingChange.bind(this, "DoNotIncludeInPathRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("urlsWithNoExtensionRegExLabel.Help")}
                                label={resx.get("urlsWithNoExtensionRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.ValidExtensionlessUrlsRegex && this.state.triedToSubmit}
                                errorMessage={resx.get("urlsWithNoExtensionRegExInvalidPattern")}
                                value={state.regexSettings.ValidExtensionlessUrlsRegex}
                                onChange={this.onSettingChange.bind(this, "ValidExtensionlessUrlsRegex")}
                                />
                        </InputGroup>
                    </div>
                    <div className="groupWrapper">
                        <InputGroup>
                            <Label
                                tooltipMessage={resx.get("validFriendlyUrlRegExLabel.Help")}
                                label={resx.get("validFriendlyUrlRegExLabel")}
                                extra={
                                    <Tooltip
                                        messages={[resx.get("GlobalSetting")]}
                                        type="global"
                                        style={{ float: "left", position: "static" }}
                                        />}
                                />
                            <SingleLineInputWithError
                                inputStyle={{ margin: "0" }}
                                withLabel={false}
                                error={this.state.error.RegexMatch && this.state.triedToSubmit}
                                errorMessage={resx.get("validFriendlyUrlRegExInvalidPattern")}
                                value={state.regexSettings.RegexMatch}
                                onChange={this.onSettingChange.bind(this, "RegexMatch")}
                                />
                        </InputGroup>
                    </div>
                    <div className="buttons-box">
                        <Button
                            disabled={!this.props.clientModified}
                            type="secondary"
                            onClick={this.onCancel.bind(this)}>
                            {resx.get("Cancel")}
                        </Button>
                        <Button
                            disabled={!this.props.clientModified}
                            type="primary"
                            onClick={this.onUpdate.bind(this)}>
                            {resx.get("Save")}
                        </Button>
                    </div>
                </div>
            );
        }
        else return <div />;
    }
}

RegexSettingsPanelBody.propTypes = {
    dispatch: PropTypes.func.isRequired,
    tabIndex: PropTypes.number,
    regexSettings: PropTypes.object,
    clientModified: PropTypes.bool
};

function mapStateToProps(state) {
    return {
        tabIndex: state.pagination.tabIndex,
        regexSettings: state.seo.regexSettings,
        clientModified: state.seo.clientModified
    };
}

export default connect(mapStateToProps)(RegexSettingsPanelBody);